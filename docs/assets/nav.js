/* =========================================================================
   vlaky.ensecnet.net documentation — navigation + i18n (EN primary, SK)
   ========================================================================= */

const GITHUB_URL = "https://github.com/ENSECNET/vlaky";
const LIVE_URL   = "https://vlaky.ensecnet.net";

const NAV = [
  { group: "nav.group.start", items: [
    { key: "nav.overview", path: "index.html" },
    { key: "nav.arch",     path: "pages/architecture.html" },
  ]},
  { group: "nav.group.ops", items: [
    { key: "nav.deploy", path: "pages/deploy.html" },
    { key: "nav.data",   path: "pages/data.html", child: true },
  ]},
];

const I18N = {
  en: {
    "ui.switch": "SK",
    "ui.github": "View on GitHub",
    "ui.live": "Open live board",
    "nav.group.start": "Getting Started",
    "nav.group.ops": "Operate",
    "nav.overview": "Overview",
    "nav.arch": "Architecture",
    "nav.deploy": "Deployment",
    "nav.data": "GTFS data refresh",

    "idx.lead": "A universal Slovak train departure board: pick a station (search, favourites, or GPS nearest) and get a live-counting board of departures — three just-left (dimmed) plus the next fifteen, each with destination, train number, and a countdown. Built on a Cloudflare Worker + D1, fed by GTFS timetable data.",
    "idx.live.label": "Live",
    "idx.live.body": "The board runs at vlaky.ensecnet.net. It's a PWA — add it to your home screen and it behaves like an app.",
    "idx.live.cta": "🚆 Open the live board → vlaky.ensecnet.net",
    "idx.live.cap": "The live board at vlaky.ensecnet.net — a station view with the next departures.",
    "idx.trip": "Tap a train → its route",
    "idx.trip.body": "Tap any departure and the board opens that train's full route — every station it calls at, with arrival/departure times. Stations already passed are dimmed; stations still ahead are bright. The current position reads at a glance.",
    "idx.trip.cap": "A trip route (/vlak/{number}) — passed stations dimmed, upcoming ones bright.",
    "idx.url": "Direct station link + home-screen shortcut",
    "idx.url.body": "Every station has its own URL — append the station to the address, e.g. vlaky.ensecnet.net/bratislava-zelezna-studienka, and the board opens straight on that station. Bookmark it, or use the browser's \"Add to Home Screen\" to drop an icon that opens your station in one tap — like a per-station app shortcut.",
    "idx.url.example": "vlaky.ensecnet.net/bratislava-zelezna-studienka",
    "idx.pwa": "Installable app — no store needed",
    "idx.pwa.body": "The whole thing is built as a PWA (Progressive Web App), so it installs straight onto your phone from the browser — no App Store, no Google Play. Open the site, choose \"Add to Home Screen\" / \"Install\", and it lands as an icon and runs full-screen like a native app. Favourites and your pinned station travel with it.",
    "idx.why": "Why this exists",
    "idx.why.lead": "This board is small on purpose. It is a working demonstration that a genuinely useful public service can be built from open data, a free cloud tier, and modern AI-assisted development — without a data centre, a budget, or a team.",
    "idx.why.1.t": "Open state data, used properly",
    "idx.why.1.b": "The timetable comes from the official GTFS feed the state publishes on data.slovensko.sk. Public data is there to be built on — this is what that looks like in practice: take the feed, transform it, give people something they can actually use on a platform.",
    "idx.why.2.t": "Minimal infrastructure, near-zero cost",
    "idx.why.2.b": "One Cloudflare Worker, one D1 database, a 45-second edge cache. No origin server, nothing running 24/7 to pay for. It serves hundreds to thousands of people a day inside the free tier. The whole architecture fits on a napkin.",
    "idx.why.3.t": "Built fast with AI vibe coding",
    "idx.why.3.b": "From idea to a deployed PWA with search, GPS, trip routes, stats, and an ops dashboard — built quickly with AI-assisted development. The barrier between \"I have an idea\" and \"it is live on a domain\" has collapsed.",
    "idx.why.close": "The point: when the will is there, a path opens — even for things that look like they need a big system, a budget, and months of work. Open data + a free cloud edge + AI as a force multiplier turns a weekend into a real, public, installable app. That is the demonstration.",
    "idx.toc": "Contents",
    "idx.card.arch.tag": "Design",
    "idx.card.arch.t": "Architecture",
    "idx.card.arch.d": "Worker + D1, edge cache, GTFS pipeline, privacy.",
    "idx.card.deploy.tag": "Ops",
    "idx.card.deploy.t": "Deployment",
    "idx.card.deploy.d": "From npm install to a bound custom domain.",
    "idx.card.data.tag": "Ops",
    "idx.card.data.t": "GTFS data refresh",
    "idx.card.data.d": "Rebuilding the timetable when the schedule changes.",
    "idx.feat": "Features",
    "idx.feat.body": "Station search with an accent-normalising autocomplete; favourites kept in localStorage on the device; a per-station URL (/{station}) you can bookmark or pin to the home screen; a GPS nearest-station lookup whose coordinates are used and discarded, never stored; PWA install; a live \"in X′ / now\" countdown; a 45-second edge cache that absorbs traffic spikes while keeping D1 idle; anonymous aggregate statistics (day · station · hour · region) with no IPs, no GPS, no individuals; and an /ops operational dashboard behind login.",
    "idx.privacy.label": "Privacy by design",
    "idx.privacy.body": "GPS coordinates for the nearest-station lookup are used in the request and thrown away — never stored. Statistics are aggregate only (day, station, hour, region from the Cloudflare edge); no IP addresses, no individual tracking.",

    "arch.crumb": "Architecture",
    "arch.title": "Architecture",
    "arch.lead": "One Cloudflare Worker serves everything; a D1 (SQLite) database holds the timetable; an edge cache absorbs load. No origin server, no always-on cost.",
    "arch.flow": "Request flow",
    "arch.flow.body": "A request for a station board hits the Worker. The Worker reads departures from D1, renders the HTML board, and the response is held in the Cloudflare edge cache for 45 seconds. Under a traffic spike the cache serves the crowd while D1 stays idle — which is what keeps the whole thing inside the free tier.",
    "arch.parts": "Pieces",
    "arch.th.part": "Piece", "arch.th.role": "Role",
    "arch.r1.p": "Worker (src/index.js)", "arch.r1.r": "Board, search, geo lookup, stats, /ops, PWA — all routes",
    "arch.r2.p": "D1 (SQLite)", "arch.r2.r": "Stations, trips, stops — the timetable, queried per board",
    "arch.r3.p": "Edge cache", "arch.r3.r": "45-second hold on board HTML — absorbs spikes",
    "arch.r4.p": "GTFS build", "arch.r4.r": "build-d1.js turns a GTFS zip into seed SQL + stations.json",
    "arch.trip": "Trip route view",
    "arch.trip.body": "Tapping a departure opens /vlak/{number} — the train's itinerary built from the GTFS stop_times for that trip. The Worker renders every called station in order with its arrival and departure time, and styles each by position: stations whose departure time is already in the past are dimmed (passed), the rest are bright (upcoming). It is a read from D1 like the board, so it benefits from the same edge cache.",
    "arch.ep": "Endpoints",
    "arch.realtime.label": "Plan, not realtime",
    "arch.realtime.body": "Times are GTFS scheduled times — there are no live delays. A realtime board would need a GTFS-RT feed, which Slovakia doesn't publish openly yet; there's a hook for it in the Worker (getBoard) for when it does.",

    "dep.crumb": "Deployment",
    "dep.title": "Deployment",
    "dep.lead": "From a clean checkout to a Worker bound to vlaky.ensecnet.net. Cloudflare Wrangler does the heavy lifting; D1 is created once and seeded from GTFS.",
    "dep.s1": "Install & create D1",
    "dep.s2": "Schema & seed",
    "dep.s2.body": "Apply the schema, then seed — either the small sample for a quick test, or the real GTFS data built by build-d1.js. The database_id that d1 create prints goes into wrangler.toml.",
    "dep.s3": "Login for /ops",
    "dep.s3.body": "The /ops dashboard is behind HTTP Basic Auth via Wrangler secrets — the password never travels in the URL. Optionally put Cloudflare Access in front (Google/MFA login, free up to 50 people) so the platform handles the gate and the app needs no changes.",
    "dep.s4": "Deploy",
    "dep.s4.body": "wrangler deploy binds vlaky.ensecnet.net automatically (custom_domain = true), provided the ensecnet.net zone is in the same Cloudflare account. The D1 binding and database_id must be committed in wrangler.toml (the id isn't secret); OPS credentials stay as secrets, never in the repo.",

    "data.crumb": "GTFS data refresh",
    "data.title": "GTFS data refresh",
    "data.lead": "The timetable changes (currently with track closures). Refreshing it is a rebuild from a fresh GTFS zip, applied to D1.",
    "data.how": "The refresh",
    "data.how.body": "Download the current GTFS zip, run build-d1.js to turn it into seed SQL, and apply it to the remote D1. On Windows, update.ps1 does all three: fetch from ŽSR, build, upload. If the download fails, grab gtfs.zip manually from data.slovensko.sk and run the script again.",
    "data.when.label": "How often",
    "data.when.body": "The 2025/2026 timetable runs 14.12.2025 – 12.12.2026. Running the refresh once a month (or after a big schedule change) is enough. An automatic monthly refresh via Cloudflare Cron Trigger is planned for v2.",

    "pager.prev": "Previous", "pager.next": "Next",
    "footer": "vlaky.ensecnet.net · ensecnet · Cloudflare Worker + D1"
  },
  sk: {
    "ui.switch": "EN",
    "ui.github": "Zobraziť na GitHube",
    "ui.live": "Otvoriť živú tabuľu",
    "nav.group.start": "Začíname",
    "nav.group.ops": "Prevádzka",
    "nav.overview": "Prehľad",
    "nav.arch": "Architektúra",
    "nav.deploy": "Nasadenie",
    "nav.data": "Aktualizácia GTFS dát",

    "idx.lead": "Univerzálna slovenská vlaková výveska: vyber stanicu (search, obľúbené, alebo GPS najbližšia) a dostaneš živo počítanú tabuľu odchodov — tri práve odišlé (stlmené) plus nasledujúcich pätnásť, každý s cieľom, číslom vlaku a odpočtom. Postavené na Cloudflare Worker + D1, kŕmené GTFS dátami cestovného poriadku.",
    "idx.live.label": "Naživo",
    "idx.live.body": "Tabuľa beží na vlaky.ensecnet.net. Je to PWA — pridaj na plochu a správa sa ako appka.",
    "idx.live.cta": "🚆 Otvoriť živú tabuľu → vlaky.ensecnet.net",
    "idx.live.cap": "Živá tabuľa na vlaky.ensecnet.net — pohľad stanice s najbližšími odchodmi.",
    "idx.trip": "Klik na vlak → jeho trasa",
    "idx.trip.body": "Klikni na ktorýkoľvek odchod a tabuľa otvorí celú trasu toho vlaku — každú stanicu, cez ktorú prechádza, s časmi príchodu/odchodu. Stanice, ktoré už absolvoval, sú stlmené; stanice, ktoré ešte prejde, sú svetlé. Aktuálnu polohu vidno na prvý pohľad.",
    "idx.trip.cap": "Trasa vlaku (/vlak/{číslo}) — absolvované stanice stlmené, nadchádzajúce svetlé.",
    "idx.url": "Priamy odkaz na stanicu + shortcut na plochu",
    "idx.url.body": "Každá stanica má vlastnú URL — pridaj názov stanice za adresu, napr. vlaky.ensecnet.net/bratislava-zelezna-studienka, a tabuľa sa otvorí rovno na tej stanici. Ulož do záložiek, alebo cez \"Pridať na plochu\" v prehliadači si vytvor ikonu, ktorá otvorí tvoju stanicu jedným ťuknutím — ako per-station shortcut na appku.",
    "idx.url.example": "vlaky.ensecnet.net/bratislava-zelezna-studienka",
    "idx.pwa": "Inštalovateľná appka — bez store",
    "idx.pwa.body": "Celé je to napísané ako PWA (Progressive Web App), takže sa nainštaluje priamo do telefónu z prehliadača — bez App Store, bez Google Play. Otvor stránku, zvoľ \"Pridať na plochu\" / \"Inštalovať\", a pristane ako ikona a beží na celú obrazovku ako natívna appka. Obľúbené aj pripnutá stanica idú s ňou.",
    "idx.why": "Prečo to vzniklo",
    "idx.why.lead": "Táto tabuľa je malá zámerne. Je to funkčná ukážka, že naozaj užitočná verejná služba sa dá postaviť z otvorených dát, free vrstvy cloudu a moderného AI-asistovaného vývoja — bez dátového centra, bez rozpočtu, bez tímu.",
    "idx.why.1.t": "Otvorené štátne dáta, použité správne",
    "idx.why.1.b": "Cestovný poriadok pochádza z oficiálneho GTFS feedu, ktorý štát zverejňuje na data.slovensko.sk. Verejné dáta sú tu na to, aby sa na nich stavalo — takto to vyzerá v praxi: vezmi feed, transformuj ho, daj ľuďom niečo, čo reálne použijú na platforme.",
    "idx.why.2.t": "Minimálna infraštruktúra, takmer nulová cena",
    "idx.why.2.b": "Jeden Cloudflare Worker, jedna D1 databáza, 45-sekundová edge cache. Žiadny origin server, nič nebeží nonstop, za čo by sa platilo. Obslúži stovky až tisíce ľudí denne vo free tieri. Celá architektúra sa zmestí na obrúsok.",
    "idx.why.3.t": "Postavené rýchlo cez AI vibe coding",
    "idx.why.3.b": "Od nápadu po nasadenú PWA so searchom, GPS, trasami vlakov, štatistikami a ops dashboardom — postavené rýchlo s AI-asistovaným vývojom. Bariéra medzi „mám nápad\" a „je to naživo na doméne\" sa zrútila.",
    "idx.why.close": "Pointa: keď je vôľa, cesta sa nájde — aj pri veciach, čo vyzerajú, že potrebujú veľký systém, rozpočet a mesiace práce. Otvorené dáta + free cloud edge + AI ako násobič síl premenia víkend na reálnu, verejnú, inštalovateľnú appku. To je tá demonštrácia.",
    "idx.toc": "Obsah",
    "idx.card.arch.tag": "Návrh",
    "idx.card.arch.t": "Architektúra",
    "idx.card.arch.d": "Worker + D1, edge cache, GTFS pipeline, súkromie.",
    "idx.card.deploy.tag": "Prevádzka",
    "idx.card.deploy.t": "Nasadenie",
    "idx.card.deploy.d": "Od npm install po naviazanú vlastnú doménu.",
    "idx.card.data.tag": "Prevádzka",
    "idx.card.data.t": "Aktualizácia GTFS dát",
    "idx.card.data.d": "Rebuild cestovného poriadku pri zmene.",
    "idx.feat": "Funkcie",
    "idx.feat.body": "Search staníc s našepkávačom, ktorý normalizuje diakritiku; obľúbené stanice držané v localStorage v zariadení; URL per stanica (/{stanica}), ktorú si uložíš do záložiek alebo pripneš na plochu; GPS vyhľadanie najbližšej stanice, ktorého súradnice sa použijú a zahodia, nikdy neukladajú; PWA inštalácia; živý odpočet „o X′ / teraz\"; 45-sekundová edge cache, čo pohltí nápory a drží D1 v kľude; anonymné agregátne štatistiky (deň · stanica · hodina · kraj) bez IP, bez GPS, bez jednotlivcov; a operačný dashboard /ops za prihlásením.",
    "idx.privacy.label": "Súkromie už v návrhu",
    "idx.privacy.body": "GPS súradnice pre vyhľadanie najbližšej stanice sa použijú v requeste a zahodia — nikdy neukladajú. Štatistiky sú len agregátne (deň, stanica, hodina, kraj z Cloudflare edge); žiadne IP adresy, žiadne sledovanie jednotlivcov.",

    "arch.crumb": "Architektúra",
    "arch.title": "Architektúra",
    "arch.lead": "Jeden Cloudflare Worker obsluhuje všetko; D1 (SQLite) databáza drží cestovný poriadok; edge cache pohlcuje záťaž. Žiadny origin server, žiadne náklady za beh nonstop.",
    "arch.flow": "Tok requestu",
    "arch.flow.body": "Request na tabuľu stanice príde na Worker. Worker prečíta odchody z D1, vyrenderuje HTML tabuľu, a odpoveď sa drží v Cloudflare edge cache 45 sekúnd. Pri nápore cache obslúži dav, kým D1 ostáva v kľude — a práve to drží celé vo free tieri.",
    "arch.parts": "Časti",
    "arch.th.part": "Časť", "arch.th.role": "Úloha",
    "arch.r1.p": "Worker (src/index.js)", "arch.r1.r": "Tabuľa, search, geo, štatistiky, /ops, PWA — všetky routy",
    "arch.r2.p": "D1 (SQLite)", "arch.r2.r": "Stanice, spoje, zastávky — cestovný poriadok, dopytovaný per tabuľa",
    "arch.r3.p": "Edge cache", "arch.r3.r": "45-sekundové držanie HTML tabule — pohlcuje nápory",
    "arch.r4.p": "GTFS build", "arch.r4.r": "build-d1.js zmení GTFS zip na seed SQL + stations.json",
    "arch.trip": "Zobrazenie trasy vlaku",
    "arch.trip.body": "Klik na odchod otvorí /vlak/{číslo} — itinerár vlaku postavený z GTFS stop_times pre daný spoj. Worker vyrenderuje každú stanicu v poradí s časom príchodu a odchodu, a naštýluje ju podľa polohy: stanice, ktorých čas odchodu je už v minulosti, sú stlmené (absolvované), zvyšok je svetlý (nadchádzajúce). Je to čítanie z D1 ako tabuľa, takže profituje z tej istej edge cache.",
    "arch.ep": "Endpointy",
    "arch.realtime.label": "Plán, nie realtime",
    "arch.realtime.body": "Časy sú GTFS plánové — žiadne živé meškania. Realtime tabuľa by potrebovala GTFS-RT feed, ktorý SK zatiaľ verejne nemá; vo Worker (getBoard) je na to pripravené miesto, keď raz bude.",

    "dep.crumb": "Nasadenie",
    "dep.title": "Nasadenie",
    "dep.lead": "Od čistého checkoutu po Worker naviazaný na vlaky.ensecnet.net. Cloudflare Wrangler robí ťažkú prácu; D1 sa vytvorí raz a naplní z GTFS.",
    "dep.s1": "Inštalácia & vytvorenie D1",
    "dep.s2": "Schéma & naplnenie",
    "dep.s2.body": "Aplikuj schému, potom naplň — buď malú vzorku na rýchly test, alebo reálne GTFS dáta postavené cez build-d1.js. database_id, ktoré d1 create vypíše, ide do wrangler.toml.",
    "dep.s3": "Login pre /ops",
    "dep.s3.body": "Dashboard /ops je za HTTP Basic Auth cez Wrangler secrets — heslo nikdy necestuje v URL. Voliteľne daj navrch Cloudflare Access (login cez Google/MFA, zadarmo do 50 ľudí), nech bránu rieši platforma a appka netreba meniť.",
    "dep.s4": "Nasadenie",
    "dep.s4.body": "wrangler deploy naviaže vlaky.ensecnet.net automaticky (custom_domain = true), ak je zóna ensecnet.net v tom istom Cloudflare účte. D1 binding a database_id musia byť commitnuté vo wrangler.toml (id nie je tajné); OPS prihlásenie ostáva ako secret, nikdy v repe.",

    "data.crumb": "Aktualizácia GTFS dát",
    "data.title": "Aktualizácia GTFS dát",
    "data.lead": "Cestovný poriadok sa mení (teraz s výlukami). Aktualizácia je rebuild z čerstvého GTFS zipu, aplikovaný do D1.",
    "data.how": "Aktualizácia",
    "data.how.body": "Stiahni aktuálny GTFS zip, spusti build-d1.js na premenu na seed SQL, a aplikuj do remote D1. Na Windows to update.ps1 spraví všetky tri: stiahne zo ŽSR, postaví, nahrá. Ak sťahovanie zlyhá, stiahni gtfs.zip ručne z data.slovensko.sk a spusti skript znova.",
    "data.when.label": "Ako často",
    "data.when.body": "Cestovný poriadok 2025/2026 platí 14.12.2025 – 12.12.2026. Spustiť aktualizáciu raz za mesiac (alebo po veľkej zmene CP) stačí. Automatický mesačný refresh cez Cloudflare Cron Trigger je plánovaný do v2.",

    "pager.prev": "Predchádzajúce", "pager.next": "Ďalšie",
    "footer": "vlaky.ensecnet.net · ensecnet · Cloudflare Worker + D1"
  }
};

(function () {
  const root = document.body.getAttribute("data-root") || "";
  const current = document.body.getAttribute("data-page") || "";
  function getLang(){ return localStorage.getItem("vlk-lang") || "en"; }
  function setLang(l){ localStorage.setItem("vlk-lang", l); apply(l); }
  function t(key, lang){ return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }
  function buildNav(lang){
    const sb=document.querySelector(".nav"); if(!sb)return; let h="";
    NAV.forEach(g=>{ h+=`<div class="nav-group"><div class="nav-group-title">${t(g.group,lang)}</div>`;
      g.items.forEach(it=>{ const c=[it.child?"child":"",it.path===current?"active":""].filter(Boolean).join(" ");
        h+=`<a href="${root}${it.path}" class="${c}">${t(it.key,lang)}</a>`; }); h+=`</div>`; });
    sb.innerHTML=h;
  }
  function apply(lang){
    document.documentElement.lang=lang;
    document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent=t(el.getAttribute("data-i18n"),lang); });
    buildNav(lang);
    const sw=document.querySelector(".lang-switch"); if(sw) sw.textContent=t("ui.switch",lang);
    const gh=document.querySelector(".gh-link span"); if(gh) gh.textContent=t("ui.github",lang);
    const lv=document.querySelector(".live-link span"); if(lv) lv.textContent=t("ui.live",lang);
  }
  function injectExtras(lang){
    const brand=document.querySelector(".brand");
    if(brand && !document.querySelector(".lang-switch")){
      const b=document.createElement("button"); b.className="lang-switch"; b.type="button";
      b.textContent=t("ui.switch",lang);
      b.addEventListener("click",()=>setLang(getLang()==="en"?"sk":"en"));
      brand.appendChild(b);
    }
    const sidebar=document.querySelector(".sidebar");
    if(sidebar && !document.querySelector(".live-link")){
      const lv=document.createElement("a"); lv.className="live-link"; lv.href=LIVE_URL; lv.target="_blank"; lv.rel="noopener";
      lv.innerHTML=`<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M2 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 2v7h12V5H2zm2 1.5h8v1H4v-1zm0 2.5h5v1H4V9z"/></svg><span>${t("ui.live",lang)}</span>`;
      sidebar.appendChild(lv);
    }
    if(sidebar && !document.querySelector(".gh-link")){
      const a=document.createElement("a"); a.className="gh-link"; a.href=GITHUB_URL; a.target="_blank"; a.rel="noopener";
      a.innerHTML=`<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg><span>${t("ui.github",lang)}</span>`;
      sidebar.appendChild(a);
    }
  }
  function mobileToggle(){
    const btn=document.querySelector(".menu-toggle"), sb=document.querySelector(".sidebar");
    if(btn&&sb){ btn.addEventListener("click",()=>sb.classList.toggle("open"));
      document.querySelectorAll(".nav a").forEach(a=>a.addEventListener("click",()=>sb.classList.remove("open"))); }
  }
  document.addEventListener("DOMContentLoaded",()=>{ const lang=getLang(); injectExtras(lang); apply(lang); mobileToggle(); });
})();
