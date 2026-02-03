# GeminiHydra - Update Desktop Shortcuts
$basePath = 'C:\Users\BIURODOM\Desktop\GeminiHydra'

$shell = New-Object -ComObject WScript.Shell

# GeminiHydra Chat shortcut
$chatShortcut = $shell.CreateShortcut('C:\Users\BIURODOM\Desktop\GeminiHydra Chat.lnk')
$chatShortcut.TargetPath = "$basePath\GeminiHydra.bat"
$chatShortcut.Arguments = ''
$chatShortcut.WorkingDirectory = $basePath
$chatShortcut.IconLocation = "$basePath\public\icon.ico"
$chatShortcut.Description = 'GeminiHydra v14.0 - Interactive Chat'
$chatShortcut.Save()
Write-Host '[OK] GeminiHydra Chat.lnk zaktualizowany' -ForegroundColor Green
Write-Host "     Target: $basePath\GeminiHydra.bat" -ForegroundColor Gray

# GeminiHydra GUI shortcut
$guiShortcut = $shell.CreateShortcut('C:\Users\BIURODOM\Desktop\GeminiHydra GUI.lnk')
$guiShortcut.TargetPath = "$basePath\launch-gui.bat"
$guiShortcut.Arguments = ''
$guiShortcut.WorkingDirectory = $basePath
$guiShortcut.IconLocation = "$basePath\public\icon.ico"
$guiShortcut.Description = 'GeminiHydra v14.0 - GUI Application'
$guiShortcut.Save()
Write-Host '[OK] GeminiHydra GUI.lnk zaktualizowany' -ForegroundColor Green
Write-Host "     Target: $basePath\launch-gui.bat" -ForegroundColor Gray

Write-Host ''
Write-Host 'Skroty zostaly zaktualizowane!' -ForegroundColor Cyan
