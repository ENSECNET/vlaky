# ============================================================
#  vlaky.ensecnet.net — naplnenie / aktualizácia D1 reálnymi dátami
#  Spusti v priečinku projektu:  .\update.ps1
#  (PowerShell. Node + wrangler už máš nainštalované.)
#
#  Zdroj: Národný katalóg otvorených dát (data.slovensko.sk), dataset ŽSR GTFS.
#  Pozn.: ak by sa download id niekedy zmenilo, otvor:
#    https://data.slovensko.sk/datasety/ebeeedf1-aca2-451a-bdc0-35d536714888
#    a skopíruj nový odkaz "Stiahnuť ZIP" do premennej $ZipUrl nižšie.
# ============================================================

$ErrorActionPreference = "Stop"
$ZipUrl  = "https://data.slovensko.sk/download?id=f63ef0f2-c4e7-496b-bdd1-44ba0e9438e9"
$ZipPath = "gtfs.zip"

Write-Host ""
Write-Host "==> 1/4  Stahujem GTFS z data.slovensko.sk..." -ForegroundColor Cyan
try {
    # prehliadacova hlavicka, aby portal nevratil HTML namiesto suboru
    $headers = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -Headers $headers -MaximumRedirection 5 -UseBasicParsing -TimeoutSec 180
    $size = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
    Write-Host "    OK: stiahnute ($size MB) -> $ZipPath" -ForegroundColor Green
    if ((Get-Item $ZipPath).Length -lt 500000) {
        Write-Host "    POZOR: subor je podozrivo maly (<0.5 MB). Mozno to nie je ZIP." -ForegroundColor Yellow
        Write-Host "    Over odkaz na: https://data.slovensko.sk/datasety/ebeeedf1-aca2-451a-bdc0-35d536714888" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    CHYBA pri stahovani. Stiahni gtfs.zip rucne z:" -ForegroundColor Red
    Write-Host "    https://data.slovensko.sk/datasety/ebeeedf1-aca2-451a-bdc0-35d536714888" -ForegroundColor Yellow
    Write-Host "    uloz do tohto priecinka ako gtfs.zip a spusti skript znova." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> 2/4  Spracuvam GTFS -> data/seed.sql ..." -ForegroundColor Cyan
node build-d1.js $ZipPath
if ($LASTEXITCODE -ne 0) { Write-Host "    CHYBA pri build-d1.js" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==> 3/4  Nahravam do D1 (remote, prepise stare data)..." -ForegroundColor Cyan
npx wrangler d1 execute vlaky --remote --file=./data/seed.sql -y
if ($LASTEXITCODE -ne 0) { Write-Host "    CHYBA pri nahravani do D1" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==> 4/4  Hotovo. Realne data su v D1." -ForegroundColor Green
Write-Host "    Skontroluj: https://vlaky.ensecnet.net/trencin" -ForegroundColor Green
Write-Host ""
