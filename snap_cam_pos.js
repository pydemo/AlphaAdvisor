/**
 * snap_cam_pos.js
 * Merged script: Gets current camera window position and takes a snapshot of that area.
 * Combines logic from test_cam_pos.js and 1snap.js
 */

const cameraPosition = require('./camera-position');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Get camera window position (use custom scale factor for best fit)
    const customScaleFactor = 1.5;
    const positions = await cameraPosition.getCameraWindowPosition({
      verbose: true,
      customScaleFactor: customScaleFactor
    });

    if (!positions || positions.length === 0) {
      console.log('Camera window not found or could not retrieve position.');
      return;
    }

    // Use the first camera window position
    const pos = positions[0];
    const left = pos.left;
    const top = pos.top;
    const width = pos.actual_width;
    const height = pos.actual_height;

    // Log position info
    console.log(`Camera window position: left=${left}, top=${top}, width=${width}, height=${height}`);

    // Prepare file paths
    const pngFilename = 'screenshot.png';
    const localPngPath = path.join(__dirname, pngFilename);
    const savePath = localPngPath.replace(/\//g, '\\');
    const scriptPath = path.join(__dirname, 'screenshot.ps1');

    // Generate PowerShell script content
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

    // Write the PowerShell script
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
  } catch (error) {
    console.error('Error in snap_cam_pos.js:', error);
  }
}

main();
