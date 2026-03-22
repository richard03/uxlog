# Jednorázově vygeneruje app-icon.png (512×512) pro `npx tauri icon`.
Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(99, 102, 241))
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$path = Join-Path $dir 'app-icon.png'
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "Saved $path"
