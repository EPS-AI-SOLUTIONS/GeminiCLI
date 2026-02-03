$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $scriptDir "..\node_modules\@modelcontextprotocol\server-filesystem\dist\index.js"
node $serverPath "C:\Users\BIURODOM\Desktop"
