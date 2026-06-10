-- vlaky.ensecnet.net — D1 schéma
-- Plánové časy z GTFS + anonymné agregované štatistiky (žiadne IP, žiadne GPS).

-- Stanice (z GTFS stops, len tie čo sú reálne stanice/zastávky vlakov)
CREATE TABLE IF NOT EXISTS stations (
  id      TEXT PRIMARY KEY,      -- normalizovaný slug, napr. "kosice", "bratislava-hl-st"
  name    TEXT NOT NULL,         -- zobrazovaný názov "Košice"
  norm    TEXT NOT NULL,         -- názov bez diakritiky/malé písmená pre vyhľadávanie
  lat     REAL,
  lon     REAL
);
CREATE INDEX IF NOT EXISTS idx_stations_norm ON stations(norm);

-- Odchody: jeden riadok = jeden odchod vlaku zo stanice v daný typ dňa
CREATE TABLE IF NOT EXISTS departures (
  station_id TEXT NOT NULL,      -- FK -> stations.id
  dep_min    INTEGER NOT NULL,   -- minúta odchodu od polnoci (0..1439, príp. >1440 po polnoci)
  cat        TEXT,               -- kategória: Os, REX, R, IC, EC, RR...
  num        TEXT,               -- číslo vlaku
  headsign   TEXT,               -- cieľ / smer ("Košice", "Žilina cez Trenčín")
  wd         INTEGER NOT NULL,   -- 1 ak platí v pracovný deň
  we         INTEGER NOT NULL,   -- 1 ak platí cez víkend
  PRIMARY KEY (station_id, dep_min, num)
);
CREATE INDEX IF NOT EXISTS idx_dep_station_time ON departures(station_id, dep_min);

-- Anonymné štatistiky: agregát na (deň, stanica, hodina, kraj). Žiadny jednotlivec.
CREATE TABLE IF NOT EXISTS stats_daily (
  day        TEXT NOT NULL,      -- "2026-06-10"
  station_id TEXT NOT NULL,      -- ktorú stanicu si pozreli
  hour       INTEGER NOT NULL,   -- 0..23 (lokálny BA čas zobrazenia)
  region     TEXT,               -- kraj z CF edge (request.cf.region), napr. "Košický kraj"
  city       TEXT,               -- mesto z CF edge (request.cf.city)
  views      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, station_id, hour, region, city)
);
CREATE INDEX IF NOT EXISTS idx_stats_day ON stats_daily(day);
CREATE INDEX IF NOT EXISTS idx_stats_station ON stats_daily(station_id, day);
