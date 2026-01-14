<#
.SYNOPSIS
    Interactively selects the AI model for the current session.
.DESCRIPTION
    This script presents a menu of available AI providers and models
    from the configuration and sets session-level environment variables
    (GEMINI_SESSION_PROVIDER and GEMINI_SESSION_MODEL) to override the
    default model selection logic.
.EXAMPLE
    .\Switch-AI.ps1
#>

[CmdletBinding()]
param()

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $PSScriptRoot "ai-config.json"

if (-not (Test-Path $configPath)) {
    Write-Error "Configuration file not found at $configPath"
    exit 1
}

try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse config file '$configPath': $_"
    exit 1
}

$modelOptions = @{}
$counter = 1

Clear-Host
Write-Host "Wybierz model AI dla tej sesji:\n" -ForegroundColor Cyan

foreach ($providerName in $config.providers.PSObject.Properties.Name) {
    $provider = $config.providers.$providerName
    if ($provider.enabled) {
        Write-Host "[$($provider.name)]" -ForegroundColor Green
        if ($provider.models.PSObject.Properties.Count -eq 0) {
            Write-Host "  (Brak modeli w konfiguracji)" -ForegroundColor Gray
        } else {
            foreach ($modelName in $provider.models.PSObject.Properties.Name) {
                $model = $provider.models.$modelName
                $modelOptions[$counter] = @{ Provider = $providerName; Model = $modelName; Tier = $model.tier }
                Write-Host "  $($counter). $modelName ($($model.tier))"
                $counter++
            }
        }
        Write-Host ""
    }
}

Write-Host "[Opcje]" -ForegroundColor Green
Write-Host "  0. Resetuj do ustawien domyslnych\n"

$choice = Read-Host "Wpisz numer i nacisnij Enter"

if ($choice -eq "0") {
    $env:GEMINI_SESSION_PROVIDER = ""
    $env:GEMINI_SESSION_MODEL = ""
    Write-Host "`nModel sesji zostal zresetowany do ustawien domyslnych." -ForegroundColor Green
} elseif ($choice -match '^\d+$' -and $modelOptions.ContainsKey([int]$choice)) {
    $selection = $modelOptions[[int]$choice]
    $env:GEMINI_SESSION_PROVIDER = $selection.Provider
    $env:GEMINI_SESSION_MODEL = $selection.Model
    Write-Host "`nDomyslny model dla tej sesji to teraz: $($selection.Provider)/$($selection.Model)" -ForegroundColor Green
} else {
    Write-Error "Nieprawidlowy wybor."
}
