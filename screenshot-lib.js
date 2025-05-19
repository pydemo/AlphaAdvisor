const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');
const windowManager = require('./window-manager');

/**
 * Creates and executes a PowerShell script from a template
 * @param {string} scriptContent - The PowerShell script content
 * @returns {Promise<string>} The script output
 */
async function runPowerShellScript(scriptContent) {
  const tempScriptPath = path.join(__dirname, `temp_ps_${Date.now()}.ps1`);
  
  // Write the script to a temporary file
  fs.writeFileSync(tempScriptPath, scriptContent);

  try {
    // Execute the PowerShell script file
    const { stdout, stderr } = await execPromise(`powershell.exe -ExecutionPolicy Bypass -File "${tempScriptPath}"`);
    
    // Clean up the temporary file
    fs.unlinkSync(tempScriptPath);
    
    if (stderr) {
      console.error('PowerShell error:', stderr);
      throw new Error(stderr);
    }
    
    return stdout.trim();
  } catch (error) {
    // Clean up the temporary file if there was an error
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    throw error;
  }
}

/**
 * Takes a screenshot of a specific window
 * @param {string} windowTitle - The title of the window to capture
 * @param {string} outputPath - The path to save the screenshot
 * @param {boolean} bringToFront - Whether to bring the window to the foreground
 * @returns {Promise<boolean>} Success status
 */
async function captureWindowScreenshot(windowTitle = 'Camera', outputPath = 'window_screenshot.png', bringToFront = true) {
  // First get the window position
  const windowPosition = await windowManager.getWindowPosition(windowTitle);
  
  if (!windowPosition) {
    console.error(`Window with title "${windowTitle}" not found`);
    return false;
  }
  
  // If requested, bring window to foreground
  if (bringToFront) {
    const focusSuccess = await windowManager.bringWindowToForeground(windowTitle);
    
    if (focusSuccess) {
      console.log('Window focused successfully');
      
      // Give the window a moment to be properly rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get updated position after focus
      const updatedPosition = await windowManager.getWindowPosition(windowTitle);
      if (updatedPosition) {
        Object.assign(windowPosition, updatedPosition);
      }
    } else {
      console.warn('Failed to focus window, screenshot may not be accurate');
    }
  } else if (windowPosition.is_minimized) {
    console.warn('Window is minimized, screenshot may not be accurate');
  }
  
  // Ensure output path is Windows-compatible
  let winOutputPath = outputPath;
  if (outputPath.startsWith('/mnt/')) {
    // Convert WSL path to Windows path
    const driveLetter = outputPath.charAt(5).toUpperCase();
    winOutputPath = `${driveLetter}:${outputPath.substring(7).replace(/\//g, '\\')}`;
  }
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Capture-Window {
    param(
        [int]$Left,
        [int]$Top,
        [int]$Width,
        [int]$Height,
        [string]$OutputPath
    )
    
    # Create bitmap with the size of the window
    $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
    
    # Create graphics object from bitmap
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Capture screen at the specified coordinates
    $graphics.CopyFromScreen($Left, $Top, 0, 0, $bitmap.Size)
    
    # Save the bitmap
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Clean up
    $graphics.Dispose()
    $bitmap.Dispose()
    
    return $true
}

# Capture the window
$result = Capture-Window -Left ${windowPosition.left} -Top ${windowPosition.top} -Width ${windowPosition.width} -Height ${windowPosition.height} -OutputPath "${winOutputPath}"
$result
`;

  try {
    const output = await runPowerShellScript(psScript);
    const success = output.trim().toLowerCase() === 'true';
    
    if (success) {
      console.log(`Screenshot saved to: ${outputPath}`);
      return true;
    } else {
      console.error('Failed to capture screenshot');
      return false;
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return false;
  }
}

module.exports = {
  captureWindowScreenshot
};
