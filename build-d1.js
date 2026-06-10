#!/usr/bin/env node
/**
 * build-d1.js — z GTFS zip vyrobí SQL seed pre D1 (stations + departures).
 *
 * Použitie:
 *   node build-d1.js gtfs.zip               # vyrobí data/seed.sql
 *   npx wrangler d1 execute vlaky --remote --file=./data/seed.sql
 *
 * Pozn.: spracúva CELÚ sieť (všetky stanice, kde zastavujú vlaky).
 * Diakritika sa pri vyhľadávaní normalizuje (norm stĺpec).
 */
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split(/\n/).filter(l => l.length);
  const head = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const o = {};
    head.forEach((h, j) => (o[h] = cells[j]));
    rows.push(o);
  }
  return rows;
}
function splitCSVLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
const deburr = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const slug = s => deburr(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const sqlStr = s => "'" + String(s ?? "").replace(/'/g, "''") + "'";
const hhmmToMin = t => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };

function main() {
  const zipPath = process.argv[2];
  if (!zipPath) { console.error("Použitie: node build-d1.js <gtfs.zip>"); process.exit(1); }
  const zip = new AdmZip(zipPath);
  const read = n => zip.getEntry(n)?.getData().toString("utf8") || "";

  const stops = parseCSV(read("stops.txt"));
  const stopTimes = parseCSV(read("stop_times.txt"));
  const trips = parseCSV(read("trips.txt"));
  const routes = parseCSV(read("routes.txt"));
  const calendar = parseCSV(read("calendar.txt"));

  // route_id -> kategória + (route_type na filter vlakov: 2 = rail v GTFS)
  const routeCat = {}, routeIsRail = {};
  for (const r of routes) {
    routeCat[r.route_id] = r.route_short_name || r.route_long_name || "vlak";
    const rt = parseInt(r.route_type, 10);
    const isRailType = rt === 2 || (rt >= 100 && rt <= 117);
    routeIsRail[r.route_id] = isRailType || /vlak|train|rail|^os$|^r$|^rex$|^ic$|^ec$|^ex$|^rr$|^zr$/i.test(routeCat[r.route_id]);
  }
  // service_id -> platnosť
  const svc = {};
  for (const c of calendar) {
    svc[c.service_id] = {
      wd: ["monday","tuesday","wednesday","thursday","friday"].some(d => c[d] === "1") ? 1 : 0,
      we: ["saturday","sunday"].some(d => c[d] === "1") ? 1 : 0,
    };
  }
  // trip_id -> meta + posledná zastávka (headsign fallback)
  const tripMeta = {};
  for (const t of trips) {
    tripMeta[t.trip_id] = {
      route_id: t.route_id,
      cat: routeCat[t.route_id] || "vlak",
      num: t.trip_short_name || t.trip_id,
      headsign: t.trip_headsign || "",
      svc: svc[t.service_id] || { wd: 1, we: 1 },
      rail: routeIsRail[t.route_id],
    };
  }

  // stop_id -> stop (len rail-relevantné neskôr odfiltrujeme cez použitie v stop_times)
  const stopById = {};
  for (const s of stops) {
    // GTFS: location_type 0 = zastávka/platform, 1 = stanica. Berieme 0 aj prázdne.
    if (s.location_type && s.location_type !== "0") continue;
    stopById[s.stop_id] = {
      name: s.stop_name, lat: parseFloat(s.stop_lat), lon: parseFloat(s.stop_lon),
    };
  }

  // Zoskup stop_times podľa trip a poradia, aby sme vedeli headsign (posledná zastávka)
  const tripStops = {};
  for (const st of stopTimes) {
    (tripStops[st.trip_id] ||= []).push(st);
  }
  for (const id in tripStops) tripStops[id].sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

  // Vytvor stanice (len tie, kde reálne zastavuje vlak) a odchody
  const stationsMap = new Map(); // slug -> {id,name,norm,lat,lon}
  const departures = []; // {station_id, dep_min, cat, num, headsign, wd, we}
  const tripsMap = new Map();   // trip_key -> {num,cat,headsign,origin,dest,wd,we}
  const tripStopsArr = [];      // {trip_key, seq, station_id, name, arr_min, dep_min}

  for (const [tripId, sts] of Object.entries(tripStops)) {
    const meta = tripMeta[tripId];
    if (!meta || !meta.rail) continue;
    const last = sts[sts.length - 1];
    const lastStop = stopById[last.stop_id];
    const destName = meta.headsign || (lastStop ? lastStop.name : "");

    // --- TRASA vlaku (všetky zastávky tripu, vrátane konečnej) ---
    const validStops = sts.filter(st => { const s = stopById[st.stop_id]; return s && s.name; });
    if (validStops.length >= 2) {
      const firstStop = stopById[validStops[0].stop_id];
      const finalStop = stopById[validStops[validStops.length - 1].stop_id];
      // trip_key: číslo + čas odchodu z prvej stanice (rozlíši varianty toho istého čísla)
      const tkey = `${meta.num}_${hhmmToMin(validStops[0].departure_time || validStops[0].arrival_time || "0:0")}`;
      if (!tripsMap.has(tkey)) {
        tripsMap.set(tkey, {
          trip_key: tkey, num: meta.num, cat: meta.cat,
          headsign: destName.trim(),
          origin: firstStop.name.trim(), dest: finalStop.name.trim(),
          wd: meta.svc.wd, we: meta.svc.we,
        });
        validStops.forEach((st, idx) => {
          const stop = stopById[st.stop_id];
          tripStopsArr.push({
            trip_key: tkey, seq: idx,
            station_id: slug(stop.name), name: stop.name.trim(),
            arr_min: st.arrival_time ? hhmmToMin(st.arrival_time) : null,
            dep_min: st.departure_time ? hhmmToMin(st.departure_time) : null,
          });
        });
      }
    }

    for (let i = 0; i < sts.length; i++) {
      const st = sts[i];
      const stop = stopById[st.stop_id];
      if (!stop || !stop.name) continue;
      if (i === sts.length - 1) continue; // z konečnej sa neodchádza ďalej
      if (!st.departure_time) continue;

      const id = slug(stop.name);
      if (!id) continue;
      if (!stationsMap.has(id)) {
        stationsMap.set(id, { id, name: stop.name.trim(), norm: deburr(stop.name), lat: stop.lat, lon: stop.lon });
      }
      departures.push({
        station_id: id,
        dep_min: hhmmToMin(st.departure_time),
        cat: meta.cat, num: meta.num, headsign: destName.trim(),
        wd: meta.svc.wd, we: meta.svc.we,
      });
    }
  }

  // Dedup odchodov (rovnaká stanica/čas/číslo)
  const seen = new Set();
  const deps = departures.filter(d => {
    const k = `${d.station_id}|${d.dep_min}|${d.num}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });

  // Zapíš SQL seed
  const out = [];
  out.push("PRAGMA foreign_keys=OFF;");
  out.push("DELETE FROM departures; DELETE FROM stations;");
  // stanice
  const stArr = [...stationsMap.values()];
  for (let i = 0; i < stArr.length; i += 500) {
    const chunk = stArr.slice(i, i + 500)
      .map(s => `(${sqlStr(s.id)},${sqlStr(s.name)},${sqlStr(s.norm)},${Number.isFinite(s.lat)?s.lat:"NULL"},${Number.isFinite(s.lon)?s.lon:"NULL"})`)
      .join(",");
    out.push(`INSERT INTO stations (id,name,norm,lat,lon) VALUES ${chunk};`);
  }
  // odchody
  for (let i = 0; i < deps.length; i += 500) {
    const chunk = deps.slice(i, i + 500)
      .map(d => `(${sqlStr(d.station_id)},${d.dep_min},${sqlStr(d.cat)},${sqlStr(d.num)},${sqlStr(d.headsign)},${d.wd},${d.we})`)
      .join(",");
    out.push(`INSERT OR IGNORE INTO departures (station_id,dep_min,cat,num,headsign,wd,we) VALUES ${chunk};`);
  }
  // trasy vlakov
  out.push("DELETE FROM trip_stops; DELETE FROM trips;");
  const trArr = [...tripsMap.values()];
  for (let i = 0; i < trArr.length; i += 400) {
    const chunk = trArr.slice(i, i + 400)
      .map(t => `(${sqlStr(t.trip_key)},${sqlStr(t.num)},${sqlStr(t.cat)},${sqlStr(t.headsign)},${sqlStr(t.origin)},${sqlStr(t.dest)},${t.wd},${t.we})`)
      .join(",");
    out.push(`INSERT OR IGNORE INTO trips (trip_key,num,cat,headsign,origin,dest,wd,we) VALUES ${chunk};`);
  }
  for (let i = 0; i < tripStopsArr.length; i += 400) {
    const chunk = tripStopsArr.slice(i, i + 400)
      .map(s => `(${sqlStr(s.trip_key)},${s.seq},${sqlStr(s.station_id)},${sqlStr(s.name)},${s.arr_min==null?"NULL":s.arr_min},${s.dep_min==null?"NULL":s.dep_min})`)
      .join(",");
    out.push(`INSERT OR IGNORE INTO trip_stops (trip_key,seq,station_id,name,arr_min,dep_min) VALUES ${chunk};`);
  }

  fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "data", "seed.sql"), out.join("\n"));
  // aj zoznam staníc do JSON pre autocomplete (statický, cachovaný v prehliadači)
  fs.writeFileSync(path.join(__dirname, "data", "stations.json"),
    JSON.stringify(stArr.map(s => ({ id: s.id, name: s.name, norm: s.norm, lat: s.lat, lon: s.lon }))));
  console.log(`OK: ${stArr.length} staníc, ${deps.length} odchodov, ${trArr.length} trás, ${tripStopsArr.length} zastávok → data/seed.sql`);
}
main();
