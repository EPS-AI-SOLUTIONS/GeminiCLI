# MCP Auto-Reconnect Script for GeminiHydra
# Uruchamiany przy starcie sesji Claude Code

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "[MCP Health Check]" -ForegroundColor Cyan

# Sprawdz status wszystkich serwerow MCP
$mcpStatus = claude mcp list 2>&1

if ($LASTEXITCODE -eq 0) {
    $lines = $mcpStatus -split "`n"
    $connected = 0
    $failed = 0

    foreach ($line in $lines) {
        if ($line -match "Connected") {
            $connected++
            $serverName = ($line -split ":")[0].Trim()
            Write-Host "  [OK] $serverName" -ForegroundColor Green
        }
        elseif ($line -match "Failed|Error|not connected") {
            $failed++
            $serverName = ($line -split ":")[0].Trim()
            Write-Host "  [FAIL] $serverName" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "[Summary] Connected: $connected | Failed: $failed" -ForegroundColor Cyan
} else {
    Write-Host "  [ERROR] Could not check MCP status" -ForegroundColor Red
}

Write-Host ""
