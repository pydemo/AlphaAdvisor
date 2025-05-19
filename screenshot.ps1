
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$left = 114
$top = 335
$width = 1430
$height = 1185
$savePath = '\home\alexb\myg\cla_2\screenshot.png'

$bounds = New-Object System.Drawing.Rectangle($left, $top, $width, $height)
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($left, $top, 0, 0, $bounds.Size)
$bitmap.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Screenshot saved to $savePath"
