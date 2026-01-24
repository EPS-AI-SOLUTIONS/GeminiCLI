$ErrorActionPreference = "SilentlyContinue"

Write-Host "--- GeminiGUI Auto-Cleanup & Launch ---" -ForegroundColor Cyan

# 1. Sprawdzanie i zwalnianie portu 1420 (Vite)
$port = 1420
Write-Host "Sprawdzanie portu $port... " -NoNewline
$tcpConnections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcpConnections) {
    Write-Host "ZAJETY." -ForegroundColor Yellow
    $pidsToKill = $tcpConnections.OwningProcess | Select-Object -Unique
    
    foreach ($pidNum in $pidsToKill) {
        # Pominiecie procesu systemowego (PID 0 lub 4)
        if ($pidNum -gt 4) {
            $proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  -> Zamykanie procesu: $($proc.ProcessName) (PID: $pidNum)..." -ForegroundColor Red
                Stop-Process -Id $pidNum -Force
            }
        }
    }
} else {
    Write-Host "WOLNY." -ForegroundColor Green
}

# 2. Zamykanie wiszących procesów aplikacji
$apps = @("geminigui")
foreach ($app in $apps) {
    if (Get-Process -Name $app -ErrorAction SilentlyContinue) {
         Write-Host "  -> Znaleziono wiszacy proces '$app'. Zamykanie..." -ForegroundColor Yellow
         Stop-Process -Name $app -Force
    }
}

# Krótka pauza, aby system zwolnił zasoby
Start-Sleep -Milliseconds 500

Write-Host "Uruchamianie aplikacji..." -ForegroundColor Cyan
Write-Host "---------------------------------------" -ForegroundColor Gray

# 3. Start
npm run tauri:dev