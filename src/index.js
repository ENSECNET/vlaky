/**
 * vlaky.ensecnet.net — univerzálna vlaková vyveska (Cloudflare Worker + D1)
 *
 * Routy:
 *   /                       → výber stanice (search + obľúbené)
 *   /{stanica}              → tabuľa odchodov pre stanicu (3 odišlé + 15 ďalších)
 *   /api/stations           → zoznam staníc (autocomplete), cache 1h
 *   /api/board?s=ID         → JSON odchody pre stanicu, edge cache 45s
 *   /api/nearest?lat=&lon=  → najbližšia stanica (GPS sa rieši v prehliadači, sem prídu len súradnice)
 *   /healthz
 *
 * Dáta: D1 (binding DB). GTFS plánové časy, bez živých meškaní.
 * Štatistiky: anonymný agregát (deň, stanica, hodina, kraj, mesto) z request.cf. Žiadne IP/GPS.
 */

const TZ = "Europe/Bratislava";
const PAST = 3, NEXT = 15;
const BOARD_CACHE_S = 45;

function nowParts() {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
  const wd = { Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0 }[p.weekday];
  return { wd, hour: parseInt(p.hour,10), minutes: parseInt(p.hour,10)*60 + parseInt(p.minute,10), hhmm: `${p.hour}:${p.minute}` };
}
const isWeekend = wd => wd === 0 || wd === 6;
const mmToHHMM = m => { const h=Math.floor(m/60)%24, mi=m%60; return `${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`; };
const deburr = s => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ---- anonymné štatistiky (best-effort, nikdy neblokuje odpoveď) ----
async function logView(env, ctx, stationId, cf) {
  if (!env.DB || !stationId) return;
  const { day, hour } = (() => {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric",month:"2-digit",day:"2-digit" });
    const h = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour:"2-digit", hour12:false });
    return { day: f.format(new Date()), hour: parseInt(h.format(new Date()),10) };
  })();
  const region = (cf && cf.region) || "?";
  const city = (cf && cf.city) || "?";
  const stmt = env.DB.prepare(
    `INSERT INTO stats_daily (day,station_id,hour,region,city,views) VALUES (?,?,?,?,?,1)
     ON CONFLICT(day,station_id,hour,region,city) DO UPDATE SET views = views + 1`
  ).bind(day, stationId, hour, region, city);
  ctx.waitUntil(stmt.run().catch(()=>{}));
}

async function getBoard(env, stationId) {
  const { minutes } = nowParts();
  const { wd } = nowParts();
  const weekend = isWeekend(wd);
  const dayCol = weekend ? "we" : "wd";
  // ďalšie odchody >= teraz
  const next = await env.DB.prepare(
    `SELECT dep_min,cat,num,headsign FROM departures
     WHERE station_id=? AND ${dayCol}=1 AND dep_min>=?
     ORDER BY dep_min ASC LIMIT ?`).bind(stationId, minutes, NEXT).all();
  // pár práve odišlých
  const past = await env.DB.prepare(
    `SELECT dep_min,cat,num,headsign FROM departures
     WHERE station_id=? AND ${dayCol}=1 AND dep_min<?
     ORDER BY dep_min DESC LIMIT ?`).bind(stationId, minutes, PAST).all();
  const station = await env.DB.prepare(`SELECT id,name FROM stations WHERE id=?`).bind(stationId).first();
  const rows = [
    ...(past.results||[]).reverse().map(r => ({ ...r, past:true })),
    ...(next.results||[]).map(r => ({ ...r, past:false })),
  ];
  return { station, rows, now: minutes, weekend };
}

// ---------- HTML ----------
const STYLE = `
:root{--bg:#0a0f0a;--panel:#0e160e;--line:#15301a;--green:#39ff7a;--green-dim:#1f6b3e;--txt:#bfe9cc;--muted:#4f7a5d;--past:#2a3f31}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--txt);font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;-webkit-font-smoothing:antialiased}
.wrap{max-width:520px;margin:0 auto;padding:14px 12px 28px;min-height:100dvh;display:flex;flex-direction:column;gap:12px}
header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:8px}
.brand{color:var(--green);font-weight:700;letter-spacing:.5px}.brand small{color:var(--muted);font-weight:400}
.clock{color:var(--green);font-variant-numeric:tabular-nums}
.search{display:flex;gap:8px}
input[type=text]{flex:1;background:var(--panel);border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:11px 12px;font:inherit;outline:none}
input[type=text]:focus{border-color:var(--green-dim)}
button,.btn{background:var(--panel);border:1px solid var(--line);color:var(--green);border-radius:8px;padding:11px 12px;font:inherit;cursor:pointer}
.geo{white-space:nowrap}
.hint{color:var(--muted);font-size:.72rem}
.results{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.results a{background:var(--panel);color:var(--txt);text-decoration:none;padding:11px 12px;display:block}
.results a:active{background:#11221a}
.results a.sel{background:#11221a}
.results a b{color:var(--green);font-weight:700}
.favs{display:flex;flex-wrap:wrap;gap:8px}
.fav{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:var(--green);text-decoration:none;font-size:.85rem}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.phead{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#0c130c;border-bottom:1px solid var(--line)}
.phead .st{color:var(--green);font-weight:700}.phead .star{cursor:pointer;color:var(--muted)}.phead .star.on{color:var(--green)}
.cols{display:flex;color:var(--muted);font-size:.6rem;text-transform:uppercase;letter-spacing:.5px;padding:6px 12px 2px}
.cols .c1{flex:0 0 52px}.cols .c2{flex:1}.cols .c3{flex:0 0 64px;text-align:right}
.row{display:flex;align-items:center;padding:9px 12px;border-top:1px solid #102014;font-variant-numeric:tabular-nums}
.row .dep{flex:0 0 52px;color:var(--green);font-weight:700;font-size:1rem}
.row .dest{flex:1;overflow:hidden;white-space:nowrap;position:relative}
.row .dest .mq{display:inline-block;white-space:nowrap}
.row .dest.scroll .mq{animation:mq 9s linear infinite}
.row .dest.scroll:hover .mq{animation-play-state:paused}
@keyframes mq{
  0%,12%{transform:translateX(0)}
  88%,100%{transform:translateX(var(--shift,0))}
}
.row .dest small{color:var(--muted)}
.row .dest small{color:var(--muted)}
.row .eta{flex:0 0 64px;text-align:right;color:var(--muted);font-size:.78rem}
.row.past{opacity:.38}.row.past .dep{color:var(--past);font-weight:400}
.row:not(.past):first-of-type .dep{text-shadow:0 0 8px rgba(57,255,122,.5)}
.empty{padding:14px 12px;color:var(--muted)}
footer{margin-top:auto;color:var(--muted);font-size:.62rem;line-height:1.5;border-top:1px solid var(--line);padding-top:8px}
footer b{color:var(--green-dim)}
a.back{color:var(--green);text-decoration:none}
`;

function pageShell(title, bodyHtml, extraScript="") {
  return `<!doctype html><html lang="sk"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0f0a"><title>${esc(title)}</title>
<link rel="manifest" href="/manifest.webmanifest">
<style>${STYLE}</style></head><body><div class="wrap">${bodyHtml}</div>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}</script>
<script>${extraScript}</script></body></html>`;
}

function homePage() {
  return pageShell("vlaky · ensecnet", `
  <header><div class="brand">vlaky<small>.ensecnet.net</small></div><div class="clock" id="clk"></div></header>
  <div class="search">
    <input id="q" type="text" placeholder="hľadaj stanicu… (napr. Trenčín)" autocomplete="off" autocapitalize="off">
    <button class="geo" id="geo" title="najbližšia stanica">📍</button>
  </div>
  <div class="hint" id="hint">Vyber stanicu a uvidíš najbližšie odchody.</div>
  <div class="results" id="res"></div>
  <div id="favwrap" style="display:none"><div class="hint">Obľúbené</div><div class="favs" id="favs"></div></div>
  <footer>Plánový čas (GTFS, ZSSK/ŽSR), <b>bez živých meškaní</b>. Over si spoj pred cestou. Anonymné štatistiky bez IP a polohy.</footer>
  `, `
  const clk=document.getElementById('clk');
  function tick(){const d=new Date().toLocaleTimeString('sk-SK',{timeZone:'${TZ}',hour:'2-digit',minute:'2-digit'});clk.textContent=d;}
  tick();setInterval(tick,15000);
  let STATIONS=[],READY=false;
  const q=document.getElementById('q'),res=document.getElementById('res'),hint=document.getElementById('hint');
  fetch('/api/stations').then(r=>r.json()).then(d=>{STATIONS=d||[];READY=true;if(q.value)run();});
  function norm(s){return (s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();}
  function score(st,v){
    const n=st.norm;
    if(n===v)return 0;
    if(n.startsWith(v))return 1;
    if(n.split(/[ .\\-]/).some(w=>w.startsWith(v)))return 2;
    const i=n.indexOf(v);
    if(i<0)return 99;
    return 3+i*0.001;
  }
  function hi(name,v){
    const nn=norm(name),i=nn.indexOf(v);
    if(i<0)return name;
    return name.slice(0,i)+'<b>'+name.slice(i,i+v.length)+'</b>'+name.slice(i+v.length);
  }
  let sel=-1,cur=[];
  function run(){
    const v=norm(q.value);res.innerHTML='';sel=-1;cur=[];
    if(!v){hint.textContent=READY?'Zadaj nazov stanice.':'Nacitavam stanice...';return;}
    if(!READY){hint.textContent='Nacitavam stanice...';return;}
    cur=STATIONS.map(s=>({s,sc:score(s,v)})).filter(x=>x.sc<99)
      .sort((a,b)=>a.sc-b.sc||a.s.norm.length-b.s.norm.length).slice(0,15).map(x=>x.s);
    if(!cur.length){hint.textContent='Nic sa nenaslo pre \u201E'+q.value+'\u201C.';return;}
    hint.textContent=cur.length+' '+(cur.length===1?'stanica':(cur.length<5?'stanice':'stanic'));
    res.innerHTML=cur.map((s,idx)=>'<a href="/'+s.id+'">'+hi(s.name,v)+'</a>').join('');
  }
  const debounce=(f,ms)=>{let t;return()=>{clearTimeout(t);t=setTimeout(f,ms);};};
  q.addEventListener('input',debounce(run,90));
  q.addEventListener('keydown',e=>{
    if(!cur.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();sel=(sel+1)%cur.length;mark();}
    else if(e.key==='ArrowUp'){e.preventDefault();sel=(sel-1+cur.length)%cur.length;mark();}
    else if(e.key==='Enter'){e.preventDefault();location.href='/'+cur[sel<0?0:sel].id;}
  });
  function mark(){[...res.children].forEach((a,i)=>a.classList.toggle('sel',i===sel));}
  q.focus();
  // obľúbené z localStorage
  try{
    const favs=JSON.parse(localStorage.getItem('vlaky_favs')||'[]');
    if(favs.length){document.getElementById('favwrap').style.display='block';
      document.getElementById('favs').innerHTML=favs.map(f=>'<a class="fav" href="/'+f.id+'">★ '+f.name+'</a>').join('');}
  }catch(e){}
  // geolokácia → najbližšia (súradnice sa použijú lokálne, pošle sa len query na výpočet)
  document.getElementById('geo').addEventListener('click',()=>{
    const h=document.getElementById('hint');
    if(!navigator.geolocation){h.textContent='Geolokácia nie je dostupná.';return;}
    h.textContent='Hľadám najbližšiu stanicu…';
    navigator.geolocation.getCurrentPosition(p=>{
      fetch('/api/nearest?lat='+p.coords.latitude+'&lon='+p.coords.longitude)
        .then(r=>r.json()).then(d=>{if(d&&d.id){location.href='/'+d.id;}else{h.textContent='Stanica sa nenašla.';}})
        .catch(()=>h.textContent='Chyba pri hľadaní.');
    },()=>{h.textContent='Poloha zamietnutá.';},{enableHighAccuracy:false,timeout:8000});
  });
  `);
}

function boardPage(board, stationId) {
  if (!board.station) {
    return pageShell("stanica nenájdená", `
    <header><div class="brand">vlaky<small>.ensecnet.net</small></div></header>
    <div class="empty">Stanica „${esc(stationId)}" sa nenašla. <a class="back" href="/">← späť na výber</a></div>`);
  }
  const { minutes } = nowParts();
  const rowsHtml = board.rows.length ? board.rows.map(r => {
    const eta = r.past ? "" : (r.dep_min - minutes <= 0 ? "teraz" : "o " + (r.dep_min - minutes) + "′");
    return `<div class="row${r.past?" past":""}">
      <span class="dep">${mmToHHMM(r.dep_min)}</span>
      <span class="dest"><span class="mq">${esc(r.headsign||"")} <small>${esc(r.cat||"")}${r.num?" "+esc(r.num):""}</small></span></span>
      <span class="eta">${eta}</span></div>`;
  }).join("") : `<div class="empty">Dnes už nič neodchádza.</div>`;

  return pageShell(board.station.name + " · odchody", `
  <header><div class="brand">vlaky<small>.ensecnet.net</small></div><div class="clock" id="clk"></div></header>
  <div><a class="back" href="/">← iná stanica</a></div>
  <div class="panel">
    <div class="phead"><span class="st">${esc(board.station.name)}</span><span class="star" id="star" title="obľúbené">☆</span></div>
    <div class="cols"><span class="c1">odch</span><span class="c2">smer / vlak</span><span class="c3">o</span></div>
    ${rowsHtml}
  </div>
  <footer>Plánový čas (GTFS), <b>bez živých meškaní</b>. ${board.weekend?"Víkendový režim. ":""}Over si spoj pred cestou.</footer>
  `, `
  const clk=document.getElementById('clk');
  function tick(){clk.textContent=new Date().toLocaleTimeString('sk-SK',{timeZone:'${TZ}',hour:'2-digit',minute:'2-digit'});}
  tick();setInterval(tick,15000);
  setTimeout(()=>location.reload(),60000);
  // obľúbené
  const ST={id:${JSON.stringify(stationId)},name:${JSON.stringify(board.station.name)}};
  const star=document.getElementById('star');
  function favs(){try{return JSON.parse(localStorage.getItem('vlaky_favs')||'[]')}catch(e){return[]}}
  function isFav(){return favs().some(f=>f.id===ST.id);}
  function paint(){star.textContent=isFav()?'★':'☆';star.classList.toggle('on',isFav());}
  star.addEventListener('click',()=>{let f=favs();if(isFav()){f=f.filter(x=>x.id!==ST.id);}else{f.push(ST);}localStorage.setItem('vlaky_favs',JSON.stringify(f));paint();});
  paint();
  // marquee: zapni rolovanie len tam, kde sa text nezmestí
  function setupMarquee(){
    document.querySelectorAll('.row .dest').forEach(d=>{
      const mq=d.querySelector('.mq'); if(!mq) return;
      const over = mq.scrollWidth - d.clientWidth;
      if(over > 6){ d.classList.add('scroll'); d.style.setProperty('--shift', (-over-8)+'px'); }
      else { d.classList.remove('scroll'); }
    });
  }
  setupMarquee(); window.addEventListener('resize', setupMarquee);
  `);
}

const MANIFEST = JSON.stringify({
  name: "vlaky.ensecnet.net", short_name: "vlaky", start_url: "/", display: "standalone",
  background_color: "#0a0f0a", theme_color: "#0a0f0a",
  icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
});
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0a0f0a"/><text x="32" y="44" font-family="monospace" font-size="40" fill="#39ff7a" text-anchor="middle">⇄</text></svg>`;

// Service worker: appshell + dáta cache-first s tichým revalidate na pozadí.
// SW_REV zvýš pri zmene SW logiky alebo keď chceš vynútiť preplach cache u klientov.
const SW_REV = "2026-06-10a";
const CACHE_V = "vlaky-" + SW_REV;
const SW = `
const V='${CACHE_V}';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==V).map(k=>caches.delete(k)));
  await self.clients.claim();
})());});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  // ops dashboard nikdy necachujeme
  if(url.pathname.startsWith('/ops')||url.pathname.startsWith('/api/ops'))return;
  // stale-while-revalidate: vrat z cache hned, na pozadi obnov
  e.respondWith((async()=>{
    const cache=await caches.open(V);
    const cached=await cache.match(req);
    const net=fetch(req).then(r=>{
      if(r&&r.status===200)cache.put(req,r.clone());
      return r;
    }).catch(()=>null);
    return cached||(await net)||new Response('offline',{status:503});
  })());
});`;


function opsBarRow(label, val, max) {
  const pct = max > 0 ? Math.round((val / max) * 100) : 0;
  return `<div class="orow"><span class="olbl">${esc(label)}</span><span class="obar"><i style="width:${pct}%"></i></span><span class="oval">${val}</span></div>`;
}
function opsPage(d) {
  const maxStation = Math.max(1, ...d.byStation.map(x => x.v));
  const maxRegion = Math.max(1, ...d.byRegion.map(x => x.v));
  const hourMap = {}; d.byHour.forEach(x => hourMap[x.hour] = x.v);
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, v: hourMap[h] || 0 }));
  const maxHour = Math.max(1, ...hours.map(x => x.v));
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ops · vlaky</title>
<style>${STYLE}
.ohead{color:var(--green);font-weight:700;margin:14px 0 6px}
.big{display:flex;gap:18px;margin:6px 0 4px}
.big div{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 16px;flex:1}
.big b{display:block;color:var(--green);font-size:1.5rem}
.big small{color:var(--muted)}
.orow{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.82rem}
.olbl{flex:0 0 42%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--txt)}
.obar{flex:1;background:#0c130c;border:1px solid var(--line);border-radius:4px;height:12px;overflow:hidden}
.obar i{display:block;height:100%;background:var(--green-dim)}
.oval{flex:0 0 48px;text-align:right;color:var(--green);font-variant-numeric:tabular-nums}
.hours{display:flex;align-items:flex-end;gap:2px;height:90px;margin-top:6px}
.hours .hb{flex:1;background:var(--green-dim);border-radius:2px 2px 0 0;min-height:1px}
.hlbls{display:flex;gap:2px;color:var(--muted);font-size:.5rem}
.hlbls span{flex:1;text-align:center}
</style></head><body><div class="wrap">
<header><div class="brand">ops<small>.vlaky</small></div><div class="clock">od ${esc(d.since)}</div></header>
<div class="big">
  <div><b>${d.totals?.v ?? 0}</b><small>zobrazení</small></div>
  <div><b>${d.totals?.s ?? 0}</b><small>staníc</small></div>
</div>
<div class="ohead">Najhľadanejšie stanice</div>
${d.byStation.map(x => opsBarRow(x.station_id, x.v, maxStation)).join("") || '<div class="hint">zatiaľ žiadne dáta</div>'}
<div class="ohead">Podľa kraja (CF edge, anonymne)</div>
${d.byRegion.map(x => opsBarRow(x.region || "?", x.v, maxRegion)).join("") || '<div class="hint">—</div>'}
<div class="ohead">Záťaž počas dňa</div>
<div class="hours">${hours.map(x => `<div class="hb" title="${x.h}:00 — ${x.v}" style="height:${Math.round((x.v/maxHour)*100)}%"></div>`).join("")}</div>
<div class="hlbls">${hours.map(x => `<span>${x.h%6===0?x.h:""}</span>`).join("")}</div>
<footer>Anonymný agregát: deň · stanica · hodina · kraj · mesto. Žiadne IP, žiadne GPS, žiadni jednotlivci.</footer>
</div></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/healthz") return new Response("ok");

    // /ops — anonymný operačný dashboard (HTTP Basic Auth)
    if (path === "/ops" || path === "/api/ops") {
      const want = env.OPS_USER && env.OPS_PASS;
      const hdr = request.headers.get("authorization") || "";
      let ok = false;
      if (want && hdr.startsWith("Basic ")) {
        try {
          const [u, p] = atob(hdr.slice(6)).split(":");
          ok = u === env.OPS_USER && p === env.OPS_PASS;
        } catch (e) { ok = false; }
      }
      if (!ok) {
        return new Response("Prihlásenie potrebné", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="vlaky ops", charset="UTF-8"' },
        });
      }
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
      const since = url.searchParams.get("since") || today;
      const totals = await env.DB.prepare(`SELECT COALESCE(SUM(views),0) v, COUNT(DISTINCT station_id) s FROM stats_daily WHERE day>=?`).bind(since).first();
      const byStation = (await env.DB.prepare(`SELECT station_id, SUM(views) v FROM stats_daily WHERE day>=? GROUP BY station_id ORDER BY v DESC LIMIT 15`).bind(since).all()).results || [];
      const byRegion = (await env.DB.prepare(`SELECT region, SUM(views) v FROM stats_daily WHERE day>=? GROUP BY region ORDER BY v DESC LIMIT 15`).bind(since).all()).results || [];
      const byHour = (await env.DB.prepare(`SELECT hour, SUM(views) v FROM stats_daily WHERE day>=? GROUP BY hour ORDER BY hour`).bind(since).all()).results || [];
      if (path === "/api/ops") return Response.json({ since, totals, byStation, byRegion, byHour });
      return new Response(opsPage({ since, totals, byStation, byRegion, byHour }), { headers: { "content-type": "text/html;charset=utf-8" } });
    }
    if (path === "/manifest.webmanifest") return new Response(MANIFEST, { headers: { "content-type": "application/manifest+json" } });
    if (path === "/sw.js") return new Response(SW, { headers: { "content-type": "application/javascript", "cache-control": "no-cache" } });
    if (path === "/icon.svg") return new Response(ICON, { headers: { "content-type": "image/svg+xml", "cache-control": "public,max-age=86400" } });

    // API: zoznam staníc (cache 1h na hrane)
    if (path === "/api/stations") {
      const cache = caches.default;
      let hit = await cache.match(request);
      if (hit) return hit;
      const { results } = await env.DB.prepare(`SELECT id,name,norm FROM stations ORDER BY name`).all();
      const resp = Response.json(results || [], { headers: { "cache-control": "public,max-age=3600" } });
      ctx.waitUntil(cache.put(request, resp.clone()));
      return resp;
    }

    // API: najbližšia stanica (výpočet z prijatých súradníc; nič sa neukladá)
    if (path === "/api/nearest") {
      const lat = parseFloat(url.searchParams.get("lat")), lon = parseFloat(url.searchParams.get("lon"));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Response.json({ error: "bad coords" }, { status: 400 });
      const { results } = await env.DB.prepare(`SELECT id,name,lat,lon FROM stations WHERE lat IS NOT NULL`).all();
      let best = null, bestD = Infinity;
      for (const s of results || []) {
        const dLat = (s.lat - lat) * 111, dLon = (s.lon - lon) * 71; // hrubý km prepočet pre SK
        const d = dLat*dLat + dLon*dLon;
        if (d < bestD) { bestD = d; best = s; }
      }
      return Response.json(best ? { id: best.id, name: best.name } : { error: "none" });
    }

    // API: board (edge cache 45s)
    if (path === "/api/board") {
      const s = url.searchParams.get("s");
      if (!s) return Response.json({ error: "no station" }, { status: 400 });
      const board = await getBoard(env, s);
      return Response.json(board, { headers: { "cache-control": `public,max-age=${BOARD_CACHE_S}` } });
    }

    // Home
    if (path === "/" || path === "") return new Response(homePage(), { headers: { "content-type": "text/html;charset=utf-8" } });

    // /{stanica}
    const stationId = decodeURIComponent(path.replace(/^\/+/, "").replace(/\/+$/, "")).toLowerCase();
    if (/^[a-z0-9-]+$/.test(stationId)) {
      // edge cache pre HTML board (45s), aby viral nápor nešiel do D1
      const cache = caches.default;
      const cacheKey = new Request(url.origin + "/" + stationId + "#board", request);
      let hit = await cache.match(cacheKey);
      if (!hit) {
        const board = await getBoard(env, stationId);
        const html = boardPage(board, stationId);
        hit = new Response(html, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": `public,max-age=${BOARD_CACHE_S}` } });
        ctx.waitUntil(cache.put(cacheKey, hit.clone()));
        if (board.station) logView(env, ctx, stationId, request.cf);
      } else {
        // aj cache-hit zarátaj do štatistík (lacné, cez waitUntil)
        logView(env, ctx, stationId, request.cf);
      }
      return hit;
    }

    return new Response("Not found", { status: 404 });
  },
};
