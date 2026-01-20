# Gemini CLI - Portable Launcher (PowerShell)
# Uruchom ten skrypt, aby uruchomic Gemini CLI

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Import AgentSwarm v3.0
if (Test-Path "$ScriptDir\AgentSwarm.psm1") {
    Import-Module "$ScriptDir\AgentSwarm.psm1" -Force
}

& node "$ScriptDir\node_modules\@google\gemini-cli\dist\index.js" @args
