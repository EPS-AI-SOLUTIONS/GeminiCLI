
Write-Host "=== Gemini Portable MCP Setup ===" -ForegroundColor Cyan

# 1. Install Dependencies
$McpDir = Join-Path $PSScriptRoot "mcp"
if (-not (Test-Path $McpDir)) { New-Item -ItemType Directory -Path $McpDir | Out-Null }

Write-Host "Installing/Updating MCP servers in $McpDir..." -ForegroundColor Yellow
Set-Location $McpDir
npm install
Set-Location $PSScriptRoot

# 2. Generate Config
$NodePath = (Get-Command node).Source
$FsServer = Join-Path $McpDir "node_modules\@modelcontextprotocol\server-filesystem\dist\index.js"
$MemServer = Join-Path $McpDir "node_modules\@modelcontextprotocol\server-memory\dist\index.js"

$Config = @{
    mcpServers = @{
        filesystem = @{
            command = $NodePath
            args = @($FsServer, $PSScriptRoot)
        }
        memory = @{
            command = $NodePath
            args = @($MemServer)
        }
    }
}

# 3. Update Settings
$SettingsPath = ".claude\settings.local.json"
if (Test-Path $SettingsPath) {
    $Settings = Get-Content $SettingsPath -Raw | ConvertFrom-Json
} else {
    $Settings = @{}
}

# Merge
if (-not $Settings.PSObject.Properties["mcpServers"]) {
    $Settings | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value $Config.mcpServers
} else {
    $Settings.mcpServers = $Config.mcpServers
}

$Settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsPath
Write-Host "Configuration updated in $SettingsPath" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Cyan

