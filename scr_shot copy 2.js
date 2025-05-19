/**
 * scr_shot.js
 * Captures a screenshot of the Camera app using the camera-position module
 */

const cameraPosition = require('./camera-position');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

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
 * Brings a window to the foreground (focuses it)
 * @param {number} handle - The window handle
 * @returns {Promise<boolean>} Success status
 */
async function focusWindow(handle) {
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    // SW_RESTORE = 9
    public const int SW_RESTORE = 9;
}
"@

# Restore the window if minimized and bring it to foreground
[Win32]::ShowWindow([IntPtr]${handle}, [Win32]::SW_RESTORE) | Out-Null
$result = [Win32]::SetForegroundWindow([IntPtr]${handle})
$result
`;

  try {
    const output = await runPowerShellScript(psScript);
    return output.trim().toLowerCase() === 'true';
  } catch (error) {
    console.error('Error focusing window:', error);
    return false;
  }
}

/**
 * Takes a screenshot of the Camera app using its position information
 * @param {Object} options - Configuration options
 * @param {string} options.outputPath - Path to save the screenshot
 * @param {boolean} options.bringToFront - Whether to bring the window to front
 * @param {boolean} options.verbose - Whether to log verbose information
 * @param {number} options.adjustLeft - Amount to adjust left position (positive = right)
 * @param {number} options.adjustTop - Amount to adjust top position (positive = down)
 * @param {number} options.customWidth - Custom width for the capture (0 = use original)
 * @param {number} options.customHeight - Custom height for the capture (0 = use original)
 * @returns {Promise<boolean>} Success status
 */
async function captureSnapshot(options = {}) {
  const {
    outputPath = './camera_snapshot.png',
    bringToFront = true,
    verbose = false,
    adjustLeft = 0,
    adjustTop = 0,
    customWidth = 0,
    customHeight = 0
  } = options;
  
  try {
    // Get camera position using the camera-position module
    if (verbose) console.log('Getting Camera window position...');
    const windowPosition = await cameraPosition.getCameraWindowPosition({ verbose });
    
    if (!windowPosition) {
      console.error('Could not find Camera window');
      return false;
    }
    
    // If requested, bring window to foreground
    if (bringToFront) {
      if (verbose) console.log('Bringing Camera window to the foreground...');
      const focusSuccess = await focusWindow(windowPosition.handle);
      
      if (focusSuccess) {
        if (verbose) console.log('Window focused successfully');
        
        // Give the window a moment to be properly rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get updated position after focus
        const updatedPosition = await cameraPosition.getCameraWindowPosition({ verbose: false });
        if (updatedPosition) {
          Object.assign(windowPosition, updatedPosition);
        }
      } else {
        console.warn('Failed to focus window, screenshot may not be accurate');
      }
    }
    
    // Apply adjustments to the window position and size
    const adjustedLeft = windowPosition.left + adjustLeft;
    const adjustedTop = windowPosition.top + adjustTop;
    
    // Use custom width/height if provided, otherwise use the original window dimensions
    const captureWidth = customWidth > 0 ? customWidth : windowPosition.width;
    const captureHeight = customHeight > 0 ? customHeight : windowPosition.height;
    
    if (verbose) {
      console.log('Original window position:', {
        left: windowPosition.left,
        top: windowPosition.top,
        width: windowPosition.width,
        height: windowPosition.height
      });
      
      console.log('Adjusted window position:', {
        left: adjustedLeft,
        top: adjustedTop,
        width: captureWidth,
        height: captureHeight,
        adjustLeft,
        adjustTop,
        customWidth,
        customHeight
      });
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

# Capture the window with adjusted positions
$result = Capture-Window -Left ${adjustedLeft} -Top ${adjustedTop} -Width ${captureWidth} -Height ${captureHeight} -OutputPath "${winOutputPath}"
$result
`;

    if (verbose) console.log(`Capturing screenshot to ${outputPath}...`);
    const output = await runPowerShellScript(psScript);
    const success = output.trim().toLowerCase() === 'true';
    
    if (success) {
      if (verbose) console.log(`Screenshot saved to: ${outputPath}`);
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

/**
 * Main function to demonstrate capturing a snapshot
 */
async function main() {
  // Get command-line arguments
  const args = process.argv.slice(2);
  const outputPath = args[0] || './camera_snapshot.png';
  const adjustLeft = parseInt(args[1] || '0', 10);
  const adjustTop = parseInt(args[2] || '0', 10);
  const customWidth = parseInt(args[3] || '0', 10);
  const customHeight = parseInt(args[4] || '0', 10);
  
  console.log('Camera Snapshot Utility');
  console.log('----------------------');
  
  // First, print information about the Camera window
  await cameraPosition.printCameraPositionInfo();
  
  console.log('\nTaking screenshot...');
  
  // Show adjustment info if any parameters are non-zero
  const hasAdjustments = adjustLeft !== 0 || adjustTop !== 0 || customWidth > 0 || customHeight > 0;
  if (hasAdjustments) {
    console.log('Using custom capture settings:');
    if (adjustLeft !== 0 || adjustTop !== 0) {
      console.log(`  Position: Left offset=${adjustLeft}, Top offset=${adjustTop}`);
    }
    if (customWidth > 0 || customHeight > 0) {
      console.log(`  Size: Width=${customWidth || 'original'}, Height=${customHeight || 'original'}`);
    }
  }
  
  const success = await captureSnapshot({
    outputPath,
    bringToFront: true,
    verbose: true,
    adjustLeft,
    adjustTop,
    customWidth,
    customHeight
  });
  
  if (success) {
    console.log(`\nScreenshot saved successfully to: ${outputPath}`);
  } else {
    console.error('\nFailed to capture screenshot');
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('An error occurred:', error);
  });
}

// Export functions for use in other modules
module.exports = {
  captureSnapshot,
  focusWindow
};