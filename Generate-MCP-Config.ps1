
$Root = $PSScriptRoot
$NodePath = (Get-Command node).Source
$McpDir = Join-Path $Root "mcp"

$FsServer = Join-Path $McpDir "node_modules\@modelcontextprotocol\server-filesystem\dist\index.js"
$MemServer = Join-Path $McpDir "node_modules\@modelcontextprotocol\server-memory\dist\index.js"

$Config = @{
    mcpServers = @{
        filesystem = @{
            command = $NodePath
            args = @($FsServer, $Root)
        }
        memory = @{
            command = $NodePath
            args = @($MemServer)
        }
    }
}

$Json = $Config | ConvertTo-Json -Depth 5
Set-Content -Path "gemini-mcp-config.json" -Value $Json
Write-Host "Config generated at $Root\gemini-mcp-config.json"

