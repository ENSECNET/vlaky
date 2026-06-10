-- Trasy vlakov: jeden vlak = sled zastávok s časmi (z GTFS stop_times)
-- num = číslo vlaku (trip_short_name), trip_key = num+wd/we varianta (deduplikácia)

CREATE TABLE IF NOT EXISTS trips (
  trip_key TEXT PRIMARY KEY,     -- jedinečný kľúč trasy (num + variant hash)
  num      TEXT NOT NULL,        -- číslo vlaku "5159"
  cat      TEXT,                 -- kategória "Os", "REX", "EC"
  headsign TEXT,                 -- cieľ "Košice"
  origin   TEXT,                 -- názov východiskovej stanice
  dest     TEXT,                 -- názov cieľovej stanice
  wd       INTEGER NOT NULL,
  we       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trips_num ON trips(num);

CREATE TABLE IF NOT EXISTS trip_stops (
  trip_key   TEXT NOT NULL,      -- FK -> trips.trip_key
  seq        INTEGER NOT NULL,   -- poradie zastávky (0..n)
  station_id TEXT NOT NULL,      -- slug stanice (= stations.id)
  name       TEXT NOT NULL,      -- názov stanice (denormalizované pre rýchlosť)
  arr_min    INTEGER,            -- príchod (min od polnoci), NULL na východiskovej
  dep_min    INTEGER,            -- odchod (min od polnoci), NULL na cieľovej
  PRIMARY KEY (trip_key, seq)
);
CREATE INDEX IF NOT EXISTS idx_tripstops_key ON trip_stops(trip_key, seq);
