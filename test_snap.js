/**
 * test_snap.js
 * Creates a snapshot of the Windows screen at camera app coordinates/size
 * Uses camera-position.js to get the camera coordinates
 * 
 * Usage:
 *   node test_snap.js [output_path] [options]
 * 
 * Options:
 *   --left=N     Adjust left coordinate by N pixels (default: 0)
 *   --top=N      Adjust top coordinate by N pixels (default: 40)
 *   --width=N    Adjust width by N pixels (default: 0)
 *   --height=N   Adjust height by N pixels (default: -40)
 *   --quiet      Suppress verbose output
 *   --help       Show this help message
 * 
 * Examples:
 *   node test_snap.js
 *   node test_snap.js my_camera_snapshot.png
 *   node test_snap.js --top=50 --height=-50
 *   node test_snap.js snapshot.png --left=10 --top=30 --width=-20 --height=-30
 * 
 * This script:
 * 1. Gets the position and dimensions of the Windows Camera app using camera-position.js
 * 2. Applies adjustments to focus on the main content area (skipping title bar)
 * 3. Takes a screenshot of that specific region of the screen
 * 4. Saves the screenshot to the specified output path (default: ./camera_snapshot.png)
 * 
 * The script uses multiple methods to capture screenshots, with fallbacks if one method fails:
 * - PowerShell's System.Drawing capabilities
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
# Load required assemblies
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

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
    
    try {
        # Get screen dimensions
        $screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
        $screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
        
        if ($Verbose) {
            Write-Host "Screen dimensions: $screenWidth x $screenHeight"
        }
        
        # Adjust coordinates if they exceed screen bounds
        if ($Left + $Width -gt $screenWidth) {
            $Width = $screenWidth - $Left
            if ($Verbose) { Write-Host "Adjusted width to: $Width" }
        }
        
        if ($Top + $Height -gt $screenHeight) {
            $Height = $screenHeight - $Top
            if ($Verbose) { Write-Host "Adjusted height to: $Height" }
        }
        
        # Create bitmap for the full screen
        $bitmap = New-Object System.Drawing.Bitmap $screenWidth, $screenHeight
        
        # Create graphics object
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Capture the entire screen
        $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
        
        # Crop to the desired region
        $rect = New-Object System.Drawing.Rectangle $Left, $Top, $Width, $Height
        $croppedBitmap = $bitmap.Clone($rect, $bitmap.PixelFormat)
        
        # Save the cropped bitmap
        $croppedBitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Clean up
        $graphics.Dispose()
        $bitmap.Dispose()
        $croppedBitmap.Dispose()
        
        if ($Verbose) {
            Write-Host "Screenshot saved successfully to: $OutputPath"
        }
        
        return $true
    }
    catch {
        Write-Error "Error capturing screenshot: $_"
        
        # Fallback method using PrintScreen
        try {
            if ($Verbose) {
                Write-Host "Trying PrintScreen fallback method..."
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
            else {
                Write-Error "Failed to get image from clipboard"
                return $false
            }
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
 * @param {Object} options.adjustments - Coordinate adjustments (optional)
 * @returns {Promise<boolean>} Success status
 */
async function takeSnapshotWithCameraCoordinates(options = {}) {
  const {
    outputPath = './camera_snapshot.png',
    verbose = false,
    adjustments = { leftOffset: 0, topOffset: 0, widthOffset: 0, heightOffset: 0 }
  } = options;
  
  try {
    // Get camera position using the camera-position module
    if (verbose) console.log('Getting Camera window position...');
    const windowPosition = await cameraPosition.getCameraWindowPosition({ verbose });
    
    if (!windowPosition) {
      console.error('Could not find Camera window');
      return false;
    }
    
    // Apply adjustments to focus on the main content area
    // Default adjustments for Windows Camera app (title bar is about 32px)
    const { leftOffset = 0, topOffset = 32, widthOffset = 0, heightOffset = -32 } = adjustments;
    
    // Calculate adjusted coordinates
    const adjustedLeft = windowPosition.left + leftOffset;
    const adjustedTop = windowPosition.top + topOffset;
    const adjustedWidth = windowPosition.width + widthOffset;
    const adjustedHeight = windowPosition.height + heightOffset;
    
    if (verbose) {
      console.log('Camera Window Position:');
      console.log(`Original Left: ${windowPosition.left}, Top: ${windowPosition.top}`);
      console.log(`Original Width: ${windowPosition.width}, Height: ${windowPosition.height}`);
      console.log(`Adjusted Left: ${adjustedLeft}, Top: ${adjustedTop}`);
      console.log(`Adjusted Width: ${adjustedWidth}, Height: ${adjustedHeight}`);
    }
    
    // Take screenshot using the adjusted window position
    return await takeScreenshot({
      left: adjustedLeft,
      top: adjustedTop,
      width: adjustedWidth,
      height: adjustedHeight,
      outputPath,
      verbose
    });
  } catch (error) {
    console.error('Error taking snapshot with camera coordinates:', error);
    return false;
  }
}

/**
 * Parse command-line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    outputPath: './camera_snapshot.png',
    adjustments: {
      leftOffset: 0,
      topOffset: 40,
      widthOffset: 0,
      heightOffset: -40
    },
    verbose: true
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      // Handle options
      const option = arg.substring(2);
      
      if (option === 'help') {
        printHelp();
        process.exit(0);
      } else if (option.startsWith('left=')) {
        result.adjustments.leftOffset = parseInt(option.split('=')[1], 10) || 0;
      } else if (option.startsWith('top=')) {
        result.adjustments.topOffset = parseInt(option.split('=')[1], 10) || 40;
      } else if (option.startsWith('width=')) {
        result.adjustments.widthOffset = parseInt(option.split('=')[1], 10) || 0;
      } else if (option.startsWith('height=')) {
        result.adjustments.heightOffset = parseInt(option.split('=')[1], 10) || -40;
      } else if (option === 'quiet') {
        result.verbose = false;
      }
    } else {
      // First non-option argument is the output path
      result.outputPath = arg;
    }
  }
  
  return result;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Camera Snapshot Utility
----------------------
Usage: node test_snap.js [output_path] [options]

Options:
  --left=N     Adjust left coordinate by N pixels (default: 0)
  --top=N      Adjust top coordinate by N pixels (default: 40)
  --width=N    Adjust width by N pixels (default: 0)
  --height=N   Adjust height by N pixels (default: -40)
  --quiet      Suppress verbose output
  --help       Show this help message

Examples:
  node test_snap.js
  node test_snap.js my_snapshot.png
  node test_snap.js --top=50 --height=-50
  node test_snap.js snapshot.png --left=10 --top=30 --width=-20 --height=-30
`);
}

/**
 * Main function to demonstrate taking a snapshot
 */
async function main() {
  // Parse command-line arguments
  const { outputPath, adjustments, verbose } = parseArgs();
  
  console.log('Camera Snapshot Utility');
  console.log('----------------------');
  
  if (verbose) {
    console.log('Using adjustments:');
    console.log(`  Left offset: ${adjustments.leftOffset}`);
    console.log(`  Top offset: ${adjustments.topOffset}`);
    console.log(`  Width offset: ${adjustments.widthOffset}`);
    console.log(`  Height offset: ${adjustments.heightOffset}`);
  }
  
  const success = await takeSnapshotWithCameraCoordinates({
    outputPath,
    verbose,
    adjustments
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
