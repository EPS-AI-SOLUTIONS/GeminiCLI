<#
.SYNOPSIS
    Generate-MCP-Config v2.1 - Hybrid/Portable (Fix)
    Merges .mcp.json definitions with local portable paths and .env variables.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$McpDir = Join-Path $ScriptDir "mcp"
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodePath) {
    Write-Warning "Node.js not found in PATH. Assuming 'node' is globally available or handled by caller."
    $NodePath = "node"
}

# --- 1. Load Environment Variables from .env ---
$EnvVars = @{}
$EnvPath = Join-Path $ScriptDir ".env"
if (Test-Path $EnvPath) {
    Get-Content $EnvPath | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            $EnvVars[$key] = $val
        }
    }
    Write-Host "[INIT] Loaded $( $EnvVars.Count ) environment variables from .env" -ForegroundColor Cyan
}

# --- 2. Load Base Configuration from .mcp.json ---
$McpJsonPath = Join-Path $ScriptDir ".mcp.json"
if (-not (Test-Path $McpJsonPath)) {
    Write-Error ".mcp.json not found!"
}

$McpConfig = Get-Content $McpJsonPath -Raw | ConvertFrom-Json
$FinalServers = @{}

# --- 3. Process Servers ---
foreach ($serverName in $McpConfig.mcpServers.PSObject.Properties.Name) {
    $serverDef = $McpConfig.mcpServers.$serverName
    $newDef = $serverDef.PSObject.Copy() # Shallow copy
    
    # A. Environment Variable Substitution
    if ($newDef.PSObject.Properties["env"]) {
        $newEnv = @{}
        foreach ($envKey in $newDef.env.PSObject.Properties.Name) {
            $val = $newDef.env.$envKey
            if ($val -match "\$\{(.+)\}") {
                $varName = $matches[1]
                if ($EnvVars.ContainsKey($varName)) {
                    $newEnv[$envKey] = $EnvVars[$varName]
                } elseif (Test-Path "env:\$varName") {
                     $newEnv[$envKey] = (Get-Item "env:\$varName").Value
                } else {
                    Write-Warning "[$serverName] Variable $varName not found in .env or system."
                    $newEnv[$envKey] = $val # Keep original if missing
                }
            } else {
                $newEnv[$envKey] = $val
            }
        }
        $newDef.env = $newEnv
    }

    # B. Portable Overrides (Core Tools)
    # Helper to convert path to file URL for ESM on Windows
    function Get-FileUrl {
        param([string]$Path)
        return 'file:///' + ($Path -replace '\\', '/')
    }

    # If the tool exists in local mcp/node_modules, use absolute local path instead of npx
    if ($serverName -eq "filesystem") {
        $localPath = Join-Path $McpDir "node_modules\@modelcontextprotocol\server-filesystem\dist\index.js"
        if (Test-Path $localPath) {
            Write-Host "[$serverName] Using local portable version." -ForegroundColor Green
            $newDef.command = $NodePath
            
            $urlPath = Get-FileUrl $localPath
            
            # Reconstruct args
            $allowedPaths = @()
            if ($newDef.args.Count -gt 3) {
                # Assuming args structure: /c, npx, -y, package, [paths...]
                for ($i = 4; $i -lt $newDef.args.Count; $i++) {
                    $allowedPaths += $newDef.args[$i]
                }
            } else {
                $allowedPaths = @($ScriptDir)
            }
            $newDef.args = @($urlPath) + $allowedPaths
        }
    }
    elseif ($serverName -eq "memory") {
        $localPath = Join-Path $McpDir "node_modules\@modelcontextprotocol\server-memory\dist\index.js"
        if (Test-Path $localPath) {
            Write-Host "[$serverName] Using local portable version." -ForegroundColor Green
            $urlPath = Get-FileUrl $localPath
            $newDef.command = $NodePath
            $newDef.args = @($urlPath)
        }
    }
    elseif ($serverName -eq "ollama") {
        $localPath = Join-Path $McpDir "node_modules\ollama-mcp\dist\index.js"
        if (Test-Path $localPath) {
            Write-Host "[$serverName] Using local portable version." -ForegroundColor Green
            $urlPath = Get-FileUrl $localPath
            $newDef.command = $NodePath
            $newDef.args = @($urlPath)
        }
    }
    
    # C. Git Path Resolution
    if ($serverName -eq "git" -and $newDef.env -and $newDef.env.GIT_DEFAULT_PATH -eq ".") {
        $newDef.env.GIT_DEFAULT_PATH = $ScriptDir.Replace('\', '/')
    }

    $FinalServers[$serverName] = $newDef
}

# --- 4. Generate Output ---
$FinalConfig = @{ mcpServers = $FinalServers }
$JsonOutput = $FinalConfig | ConvertTo-Json -Depth 10

$OutputPath = Join-Path $ScriptDir "gemini-mcp-config.json"
Set-Content -Path $OutputPath -Value $JsonOutput -Encoding UTF8
Write-Host "Configuration generated successfully at: $OutputPath" -ForegroundColor Green
Write-Host "Active Servers: $($FinalServers.Keys -join ', ')" -ForegroundColor Gray
