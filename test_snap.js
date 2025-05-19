/**
 * test_snap.js
 * Creates a snapshot of the Windows screen at camera app coordinates/size
 * Uses camera-position.js to get the camera coordinates
 * 
 * Usage:
 *   node test_snap.js [output_path]
 * 
 * Examples:
 *   node test_snap.js
 *   node test_snap.js my_camera_snapshot.png
 *   node test_snap.js ./snapshots/camera.png
 * 
 * This script:
 * 1. Gets the position and dimensions of the Windows Camera app using camera-position.js
 * 2. Takes a screenshot of that specific region of the screen
 * 3. Saves the screenshot to the specified output path (default: ./camera_snapshot.png)
 * 
 * The script uses multiple methods to capture screenshots, with fallbacks if one method fails:
 * - Windows Snipping Tool
 * - PowerShell's System.Drawing capabilities
 * - Windows Game Bar
 * - PrintScreen key + clipboard processing
 */

const cameraPosition = require('./camera-position');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

/**
 * Creates and executes a PowerShell script
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
 * Takes a screenshot at the specified coordinates and size
 * @param {Object} options - Configuration options
 * @param {number} options.left - Left coordinate
 * @param {number} options.top - Top coordinate
 * @param {number} options.width - Width of the screenshot
 * @param {number} options.height - Height of the screenshot
 * @param {string} options.outputPath - Path to save the screenshot
 * @param {boolean} options.verbose - Whether to log verbose information
 * @returns {Promise<boolean>} Success status
 */
async function takeScreenshot(options) {
  const {
    left,
    top,
    width,
    height,
    outputPath = './screen_snapshot.png',
    verbose = false
  } = options;
  
  if (verbose) {
    console.log(`Taking screenshot at (${left}, ${top}) with size ${width}x${height}`);
    console.log(`Saving to: ${outputPath}`);
  }
  
  // Ensure output path is Windows-compatible
  let winOutputPath = outputPath;
  if (outputPath.startsWith('/mnt/')) {
    // Convert WSL path to Windows path
    const driveLetter = outputPath.charAt(5).toUpperCase();
    winOutputPath = `${driveLetter}:${outputPath.substring(7).replace(/\//g, '\\')}`;
  }
  
  const psScript = `
# Function to capture a screenshot using Windows.Media.Capture API
function Capture-Screenshot {
    param(
        [int]$Left,
        [int]$Top,
        [int]$Width,
        [int]$Height,
        [string]$OutputPath,
        [switch]$Verbose
    )

    # Validate input parameters
    if ($Left -lt 0) { $Left = 0 }
    if ($Top -lt 0) { $Top = 0 }
    
    # Ensure minimum dimensions
    if ($Width -lt 1) { $Width = 1 }
    if ($Height -lt 1) { $Height = 1 }
    
    if ($Verbose) {
        Write-Host "Capturing screenshot at coordinates: Left=$Left, Top=$Top, Width=$Width, Height=$Height"
        Write-Host "Output path: $OutputPath"
    }
    
    # Ensure output directory exists
    $directory = [System.IO.Path]::GetDirectoryName($OutputPath)
    if (-not [string]::IsNullOrEmpty($directory) -and -not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    
    # Method 1: Use Windows built-in screenshot utility (Win+Shift+S)
    try {
        if ($Verbose) {
            Write-Host "Using Windows Screenshot utility method..."
        }
        
        # Create a temporary file for the full screenshot
        $tempFile = [System.IO.Path]::GetTempFileName() -replace '\\.tmp$', '.png'
        
        # Load the required assemblies
        Add-Type -AssemblyName System.Windows.Forms
        
        # Take a full screenshot
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        
        # Use the SnippingTool to capture the screen
        $snippingToolPath = "C:\\Windows\\System32\\SnippingTool.exe"
        if (Test-Path $snippingToolPath) {
            if ($Verbose) {
                Write-Host "Using SnippingTool for capture..."
            }
            
            # Start the SnippingTool in silent mode and capture the screen
            Start-Process -FilePath $snippingToolPath -ArgumentList "/clip" -NoNewWindow -Wait
            Start-Sleep -Seconds 1
            
            # Save the clipboard content to the output file
            Add-Type -AssemblyName System.Windows.Forms
            if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
                $image = [System.Windows.Forms.Clipboard]::GetImage()
                
                # Save the image to the output path
                $image.Save($OutputPath)
                
                if ($Verbose) {
                    Write-Host "Screenshot saved successfully to: $OutputPath"
                }
                
                return $true
            }
        }
        
        # Method 2: Use PowerShell's built-in screenshot capability
        if ($Verbose) {
            Write-Host "Using PowerShell screenshot method..."
        }
        
        Add-Type -AssemblyName System.Drawing
        Add-Type -AssemblyName System.Windows.Forms
        
        # Create a bitmap of the appropriate size
        $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
        
        # Create a graphics object from the bitmap
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Capture the screen
        $graphics.CopyFromScreen($Left, $Top, 0, 0, $bitmap.Size)
        
        # Save the bitmap to the output path
        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Clean up
        $graphics.Dispose()
        $bitmap.Dispose()
        
        if ($Verbose) {
            Write-Host "Screenshot saved successfully to: $OutputPath"
        }
        
        return $true
    }
    catch {
        Write-Error "Error capturing screenshot: $_"
        
        # Method 3: Use the Windows Game Bar (Win+G) screenshot feature
        try {
            if ($Verbose) {
                Write-Host "Trying Windows Game Bar screenshot method..."
            }
            
            # Simulate Win+Alt+PrtScn key combination
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait('^%{PRTSC}')
            Start-Sleep -Seconds 2
            
            # Check if the screenshot was saved to the default location
            $picturesFolder = [Environment]::GetFolderPath('MyPictures')
            $capturesFolder = Join-Path $picturesFolder 'Captures'
            
            if (Test-Path $capturesFolder) {
                $latestScreenshot = Get-ChildItem $capturesFolder | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                
                if ($latestScreenshot -ne $null) {
                    Copy-Item $latestScreenshot.FullName -Destination $OutputPath -Force
                    
                    if ($Verbose) {
                        Write-Host "Screenshot saved using Game Bar to: $OutputPath"
                    }
                    
                    return $true
                }
            }
            
            # Method 4: Last resort - use PrintScreen and save from clipboard
            if ($Verbose) {
                Write-Host "Trying PrintScreen method..."
            }
            
            # Clear clipboard
            [System.Windows.Forms.Clipboard]::Clear()
            
            # Send PrintScreen key
            [System.Windows.Forms.SendKeys]::SendWait('{PRTSC}')
            Start-Sleep -Seconds 1
            
            # Check if we have an image in clipboard
            if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
                $image = [System.Windows.Forms.Clipboard]::GetImage()
                
                # Create a new bitmap with the specified dimensions
                $croppedImage = New-Object System.Drawing.Bitmap $Width, $Height
                $g = [System.Drawing.Graphics]::FromImage($croppedImage)
                
                # Define the source rectangle
                $srcRect = New-Object System.Drawing.Rectangle $Left, $Top, $Width, $Height
                
                # Draw the portion of the image we want
                $g.DrawImage($image, 0, 0, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
                
                # Save the cropped image
                $croppedImage.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
                
                # Clean up
                $g.Dispose()
                $croppedImage.Dispose()
                $image.Dispose()
                
                if ($Verbose) {
                    Write-Host "Screenshot saved using PrintScreen to: $OutputPath"
                }
                
                return $true
            }
            
            Write-Error "Failed to capture screenshot using all available methods"
            return $false
        }
        catch {
            Write-Error "All screenshot methods failed: $_"
            return $false
        }
    }
}

$verboseFlag = if ($${verbose}) { "-Verbose" } else { "" }
$result = Capture-Screenshot -Left ${left} -Top ${top} -Width ${width} -Height ${height} -OutputPath "${winOutputPath}" $verboseFlag
$result
`;

  try {
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
 * Takes a snapshot using camera coordinates
 * @param {Object} options - Configuration options
 * @param {string} options.outputPath - Path to save the screenshot
 * @param {boolean} options.verbose - Whether to log verbose information
 * @returns {Promise<boolean>} Success status
 */
async function takeSnapshotWithCameraCoordinates(options = {}) {
  const {
    outputPath = './camera_snapshot.png',
    verbose = false
  } = options;
  
  try {
    // Get camera position using the camera-position module
    if (verbose) console.log('Getting Camera window position...');
    const windowPosition = await cameraPosition.getCameraWindowPosition({ verbose });
    
    if (!windowPosition) {
      console.error('Could not find Camera window');
      return false;
    }
    
    if (verbose) {
      console.log('Camera Window Position:');
      console.log(`Left: ${windowPosition.left}, Top: ${windowPosition.top}`);
      console.log(`Width: ${windowPosition.width}, Height: ${windowPosition.height}`);
    }
    
    // Take screenshot using the window position
    return await takeScreenshot({
      left: windowPosition.left,
      top: windowPosition.top,
      width: windowPosition.width,
      height: windowPosition.height,
      outputPath,
      verbose
    });
  } catch (error) {
    console.error('Error taking snapshot with camera coordinates:', error);
    return false;
  }
}

/**
 * Main function to demonstrate taking a snapshot
 */
async function main() {
  // Get command-line arguments
  const args = process.argv.slice(2);
  const outputPath = args[0] || './camera_snapshot.png';
  
  console.log('Camera Snapshot Utility');
  console.log('----------------------');
  
  const success = await takeSnapshotWithCameraCoordinates({
    outputPath,
    verbose: true
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
  takeScreenshot,
  takeSnapshotWithCameraCoordinates
};
