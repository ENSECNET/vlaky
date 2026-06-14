<div align="center">

# 🚆 vlaky.ensecnet.net

**A universal Slovak train departure board**

Pick a station · live-counting departures · Cloudflare Worker + D1 · PWA

[![Live](https://img.shields.io/badge/🚆_Live-vlaky.ensecnet.net-0bb3a0?style=for-the-badge)](https://vlaky.ensecnet.net)
[![Docs](https://img.shields.io/badge/📖_Documentation-View_docs-131c2b?style=for-the-badge)](https://ensecnet.github.io/vlaky/index.html)
[![Platform](https://img.shields.io/badge/Platform-Cloudflare_Worker_·_D1-131c2b?style=for-the-badge)](https://workers.cloudflare.com/)

</div>

---

> ### 🚆 [**Open the live board → vlaky.ensecnet.net**](https://vlaky.ensecnet.net)
>
> Pick a station (search, favourites, or GPS nearest) and get a live board of
> departures. It's a PWA — add it to your home screen and it behaves like an app.
> Full documentation (EN / SK) with architecture and deployment is
> **[here](https://ensecnet.github.io/vlaky/index.html)**.

---

## What it is

A departure board for Slovak train stations: choose a station and see three
just-left departures (dimmed) plus the next fifteen — each with destination,
train number, and a live countdown. Plan times come from GTFS (ZSSK / ŽSR);
no live delays.

Built as a single **Cloudflare Worker** with a **D1 (SQLite)** database and a
45-second edge cache — no origin server, runs inside the free tier.

## Features

- **Station search** with an accent-normalising autocomplete
- **Favourites** kept in `localStorage` on the device
- **Per-station URL** (`/{station}`) — bookmark or pin to the home screen
- **📍 GPS nearest station** — coordinates are used and discarded, never stored
- **PWA** — installable, app-like
- **Live countdown** — "in X′ / now"
- **45-second edge cache** — absorbs traffic spikes, keeps D1 idle
- **Anonymous aggregate stats** — day · station · hour · region; no IPs, no individuals
- **`/ops` dashboard** — operational view behind login

## Privacy by design

GPS coordinates for the nearest-station lookup are used in the request and thrown
away — never stored. Statistics are aggregate only (day, station, hour, region
from the Cloudflare edge); no IP addresses, no individual tracking.

## Quick start

```bash
cd ~/vlaky && npm install
npx wrangler d1 create vlaky          # paste database_id into wrangler.toml
npx wrangler d1 execute vlaky --remote --file=./migrations/0001_init.sql
node build-d1.js gtfs.zip             # build timetable from GTFS
npx wrangler d1 execute vlaky --remote --file=./data/seed.sql
npx wrangler deploy                   # binds vlaky.ensecnet.net (custom_domain)
```

Full walk-through — schema, seeding, `/ops` login, custom domain — is in the
**[documentation](https://ensecnet.github.io/vlaky/pages/deploy.html)**.

## Repository layout

```
vlaky/
├─ src/index.js              # Worker: board, search, geo, stats, /ops, PWA
├─ migrations/0001_init.sql  # D1 schema
├─ build-d1.js               # GTFS zip → data/seed.sql + data/stations.json
├─ data/seed_sample.sql      # small sample for a pre-GTFS test
├─ update.ps1                # one-shot GTFS refresh (Windows)
├─ wrangler.toml
└─ package.json
```

## Documentation

Served from the `docs/` folder via GitHub Pages (EN primary, SK switch):

| Page | What's in it |
|------|--------------|
| [Overview](https://ensecnet.github.io/vlaky/index.html) | Features, privacy model |
| [Architecture](https://ensecnet.github.io/vlaky/pages/architecture.html) | Worker + D1, edge cache, endpoints |
| [Deployment](https://ensecnet.github.io/vlaky/pages/deploy.html) | From npm install to bound domain |
| [GTFS data refresh](https://ensecnet.github.io/vlaky/pages/data.html) | Rebuilding the timetable |

## Limits / cost

Free tier: Worker 100k req/day, D1 5 GB + 5M reads/day. With the 45-second edge
cache that holds hundreds to thousands of daily users for free. Times are GTFS
**plan**, not realtime — a realtime board would need a GTFS-RT feed, which
Slovakia doesn't publish openly yet (there's a hook for it in the Worker).

## License

GTFS data © ZSSK / ŽSR, from [data.slovensko.sk](https://data.slovensko.sk).
Code under this repository's license.
