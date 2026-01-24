Import-Module "$PSScriptRoot\AgentSwarm.psm1" -Force
Write-Host "--- STARTING SWARM DEBUG ---" -ForegroundColor Cyan
try {
    Invoke-AgentSwarm -Objective "Check the file GEMINI.md and tell me what is the version of GeminiHydra."
}
catch {
    Write-Error $_
}
Write-Host "--- SWARM DEBUG FINISHED ---" -ForegroundColor Cyan
