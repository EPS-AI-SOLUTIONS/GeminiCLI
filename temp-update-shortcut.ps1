$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut('C:\Users\BIURODOM\Desktop\GeminiHydra Chat.lnk')
$shortcut.TargetPath = 'C:\Users\BIURODOM\Desktop\GeminiHydra\claude-code.bat'
$shortcut.Arguments = ''
$shortcut.WorkingDirectory = 'C:\Users\BIURODOM\Desktop\GeminiHydra'
$shortcut.IconLocation = 'C:\Users\BIURODOM\Desktop\GeminiHydra\public\icon.ico'
$shortcut.Save()
Write-Host 'Skrot - uruchamia batch bezposrednio' -ForegroundColor Green
