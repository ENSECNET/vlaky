# vlaky.ensecnet.net — univerzálna vlaková vyveska

Vyber stanicu (search / obľúbené / GPS „najbližšia") → tabuľa odchodov:
3 práve odišlé (stlmené) + 15 nasledujúcich, s cieľom, číslom vlaku a odpočtom.
Cloudflare Worker + D1. Plánové časy z GTFS (ZSSK/ŽSR), bez živých meškaní.

## Funkcie v1
- Search staníc s našepkávačom (autocomplete, diakritika sa normalizuje)
- Obľúbené stanice (localStorage, lokálne v telefóne)
- `/{stanica}` v URL → záložka/ikona na plochu rovno na konkrétnu stanicu
- 📍 najbližšia stanica z GPS — **súradnice sa použijú a zahodia, neukladajú sa**
- PWA — „pridať na plochu", správa sa ako appka
- Odpočet „o X′ / teraz"
- Edge cache 45 s → drží to vo free tieri aj pri nápore (cache pohltí viral, D1 ostáva v kľude)
- Anonymné štatistiky: agregát (deň · stanica · hodina · kraj · mesto z CF edge). Žiadne IP, žiadne GPS, žiadni jednotlivci.
- `/ops?k=TOKEN` — operačný dashboard (počty, top stanice, kraje, záťaž dňa)

## Štruktúra
```
vlaky/
├─ src/index.js              # Worker: board, search, geo, stats, /ops, PWA
├─ migrations/0001_init.sql  # D1 schéma
├─ build-d1.js               # GTFS zip -> data/seed.sql + data/stations.json
├─ data/seed_sample.sql      # malá vzorka na test pred reálnym GTFS
├─ wrangler.toml
└─ package.json
```

## Nasadenie — krok za krokom

### 1) Inštalácia
```bash
cd ~/vlaky && npm install
```

### 2) Vytvor D1 databázu
```bash
npx wrangler d1 create vlaky
```
Vypíše `database_id` — **vlož ho do `wrangler.toml`** namiesto `REPLACE_AFTER_d1_create`.

### 3) Schéma
```bash
npx wrangler d1 execute vlaky --remote --file=./migrations/0001_init.sql
```

### 4a) Rýchly test so vzorkou (voliteľné)
```bash
npx wrangler d1 execute vlaky --remote --file=./data/seed_sample.sql
```

### 4b) Reálne dáta z GTFS
```bash
# stiahni aktuálny GTFS zip ZSSK (Transitland feed f-eo0-zssk) ako gtfs.zip
node build-d1.js gtfs.zip
npx wrangler d1 execute vlaky --remote --file=./data/seed.sql
```

### 5) Login pre /ops dashboard (HTTP Basic Auth)
```bash
npx wrangler secret put OPS_USER     # napr. paul
npx wrangler secret put OPS_PASS     # tvoje heslo
```
Otvor `/ops` → prehliadač vyhodí prihlasovacie okno (meno + heslo).
Heslo nechodí v URL. Voliteľne navrch **Cloudflare Access** (login cez Google/MFA,
zadarmo do 50 ľudí): CF dashboard → Zero Trust → Access → Applications →
Add → Self-hosted → doména `vlaky.ensecnet.net`, path `/ops` → pravidlo na tvoj email.
Vtedy appku netreba meniť, bránu rieši platforma.

### 6) Nasadenie
```bash
npx wrangler deploy
```
Vďaka `custom_domain = true` sa naviaže `vlaky.ensecnet.net` automaticky
(zóna ensecnet.net musí byť v tom istom CF účte).

## Git + CI deploy (ako ensecnet / doprava)
1. Repo `TencoNemaStrach/vlaky`, pushni obsah.
2. CF dashboard → Workers & Pages → Create → Import a repository → vyber `vlaky`.
3. Deploy command: `npx wrangler deploy`, Build prázdne, Path `/`.
4. Pozn.: D1 binding aj `database_id` musia byť vo `wrangler.toml` commitnuté
   (database_id nie je tajné). `OPS_TOKEN` drž ako secret, nie v repe.

## Aktualizácia poriadku
Cestovný poriadok sa mení (teraz výluky). Po novom GTFS:
```bash
node build-d1.js gtfs.zip
npx wrangler d1 execute vlaky --remote --file=./data/seed.sql
```
Pokojne cez cron raz za pár týždňov.

## Endpointy
- `/`                      — výber stanice
- `/{stanica}`             — tabuľa odchodov (HTML, edge cache 45 s)
- `/api/stations`          — zoznam staníc (cache 24 h)
- `/api/board?s=ID`        — odchody (JSON)
- `/api/nearest?lat=&lon=` — najbližšia stanica
- `/ops`                     — operačný dashboard (Basic Auth)
- `/healthz`

## Limity / náklady
Free tier: Worker 100k req/deň, D1 5 GB + 5M čítaní/deň. Pri edge cache 45 s
to drží stovky až tisíce ľudí denne zadarmo. Ak by raz prerástlo → Workers Paid 5 USD/mes.

**Bez živých meškaní** — GTFS je plán. Pre realtime by bol potrebný GTFS-RT feed,
ktorý SK zatiaľ verejne nemá; v `src/index.js` je na to miesto (getBoard).

## Naplnenie reálnymi dátami (jeden klik)
V priečinku projektu spusti:
```powershell
.\update.ps1
```
Skript: stiahne GTFS zo ŽSR → spustí build-d1.js → nahrá do D1 (remote).
Ak by sťahovanie zlyhalo, stiahni `gtfs.zip` ručne z
https://data.slovensko.sk/datasety/ca4cb74c-7192-4198-b074-34acd9d295e7
do priečinka a spusti skript znova.

Cestovný poriadok 2025/2026 platí 14.12.2025 – 12.12.2026. Stačí spustiť
`update.ps1` raz za mesiac (alebo po veľkej zmene CP). Automatický mesačný
refresh cez Cloudflare Cron Trigger je plánovaný do v2.
