param(
    [string]$Message = "Confirm action"
)

$BridgeFile = "C:\Users\BIURODOM\Desktop\GeminiCLI\bridge.json"

function Get-BridgeData {
    if (Test-Path $BridgeFile) {
        return Get-Content $BridgeFile -Raw | ConvertFrom-Json
    }
    return @{ requests = @(); auto_approve = $false }
}

function Set-BridgeData {
    param($Data)
    $Data | ConvertTo-Json -Depth 10 | Set-Content $BridgeFile
}

# 1. Check Auto-Approve
$data = Get-BridgeData
if ($data.auto_approve) {
    Write-Host "Auto-approved by GUI Bridge." -ForegroundColor Green
    return $true
}

# 2. Create Request
$id = [guid]::NewGuid().ToString().Substring(0, 8)
$req = @{
    id = $id
    message = $Message
    status = "pending"
}

if (-not $data.requests) { $data.requests = @() }
$data.requests += $req
Set-BridgeData $data

Write-Host "Waiting for approval in GUI (ID: $id)..." -ForegroundColor Cyan

# 3. Poll for Status
while ($true) {
    Start-Sleep -Seconds 1
    $data = Get-BridgeData
    $myReq = $data.requests | Where-Object { $_.id -eq $id }
    
    if (-not $myReq) {
        Write-Error "Request disappeared!"
        return $false
    }

    if ($myReq.status -eq "approved") {
        Write-Host "Approved!" -ForegroundColor Green
        return $true
    }
    if ($myReq.status -eq "rejected") {
        Write-Host "Rejected!" -ForegroundColor Red
        return $false
    }
}
