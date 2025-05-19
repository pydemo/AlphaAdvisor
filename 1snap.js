const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const left = 237, top = 225, width = 838, height = 863;
// Save the PNG to the current directory
const pngFilename = 'screenshot.png';
const localPngPath = path.join(__dirname, pngFilename);
// Convert to Windows path format for PowerShell
const savePath = localPngPath.replace(/\//g, '\\');

// Create a PowerShell script file in the current directory
const scriptPath = path.join(__dirname, 'screenshot.ps1');
const scriptContent = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$left = ${left}
$top = ${top}
$width = ${width}
$height = ${height}
$savePath = '${savePath}'

$bounds = New-Object System.Drawing.Rectangle($left, $top, $width, $height)
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($left, $top, 0, 0, $bounds.Size)
$bitmap.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Screenshot saved to $savePath"
`;

// Write the script to a file in the current directory
fs.writeFileSync(scriptPath, scriptContent);

// Execute the PowerShell script
const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

exec(command, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${err.message}`);
    console.error(stderr);
  } else {
    console.log(stdout);
    console.log('Screenshot taken successfully!');
    console.log(`The PowerShell script was saved to: ${scriptPath}`);
    console.log(`The screenshot was saved to: ${localPngPath}`);
  }
});