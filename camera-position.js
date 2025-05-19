/**
 * camera-position.js
 * A module for detecting the position and dimensions of the Windows Camera app
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

/**
 * CameraPositionModule - provides methods to get Camera app window details
 */
class CameraPositionModule {
/**
 * Gets the position and size of the Camera windows
 * @param {Object} options - Optional configuration parameters
 * @param {boolean} options.verbose - Whether to log detailed information (default: false)
 * @param {number} options.customScaleFactor - Custom scaling factor to apply to dimensions (default: 1.0)
 * @returns {Promise<Array<Object>|null>} Array of window position information or null if not found
 */
  async getCameraWindowPosition(options = {}) {
    const { verbose = false, customScaleFactor = 1.0 } = options;
    
    if (verbose) console.log('Getting Camera window positions across all monitors...');
    
    // Create a temporary PowerShell script file
    const tempScriptPath = path.join(__dirname, 'temp_get_window.ps1');
    
    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern int GetDpiForWindow(IntPtr hWnd);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

# Find all Camera processes
$cameraProcesses = Get-Process | Where-Object { $_.MainWindowTitle -eq 'Camera' }

if ($cameraProcesses -and $cameraProcesses.Count -gt 0) {
    $results = @()
    
    foreach ($cameraProcess in $cameraProcesses) {
        if ($cameraProcess.MainWindowHandle -ne 0) {
            $handle = $cameraProcess.MainWindowHandle
            $rect = New-Object Win32+RECT
            
            # Get window position - suppress boolean result
            [void][Win32]::GetWindowRect([IntPtr]$handle, [ref]$rect)
            
            # Get DPI for the window
            $dpi = [Win32]::GetDpiForWindow([IntPtr]$handle)
            $dpiScale = if ($dpi -gt 0) { $dpi / 96.0 } else { 1.0 }
            
            # Calculate raw dimensions
            $rawWidth = ($rect.Right - $rect.Left)
            $rawHeight = ($rect.Bottom - $rect.Top)
            
            # Calculate DPI-adjusted dimensions
            $adjustedWidth = [Math]::Round($rawWidth * (1.0 / $dpiScale))
            $adjustedHeight = [Math]::Round($rawHeight * (1.0 / $dpiScale))
            
            # Add window info to results array
            $results += @{
                "process_name" = $cameraProcess.Name
                "window_title" = $cameraProcess.MainWindowTitle
                "handle" = $handle
                "left" = $rect.Left
                "top" = $rect.Top
                "right" = $rect.Right
                "bottom" = $rect.Bottom
                "width" = $rawWidth
                "height" = $rawHeight
                "adjusted_width" = $adjustedWidth
                "adjusted_height" = $adjustedHeight
                "dpi" = $dpi
                "dpi_scale" = $dpiScale
                "monitor_id" = $results.Count + 1  # Add monitor ID (1-based)
            }
        }
    }
    
    # Return all window info as JSON array
    if ($results.Count -gt 0) {
        $results | ConvertTo-Json
    } else {
        "{ ""error"": ""No valid Camera windows found"" }"
    }
}
else {
    "{ ""error"": ""Camera window not found"" }"
}
`;

    // Write the script to a temporary file
    fs.writeFileSync(tempScriptPath, psScript);

    try {
      // Execute the PowerShell script file
      const { stdout, stderr } = await execPromise(`powershell.exe -ExecutionPolicy Bypass -File "${tempScriptPath}"`);
      
      // Clean up the temporary file
      fs.unlinkSync(tempScriptPath);
      
      if (stderr) {
        if (verbose) console.error('PowerShell error:', stderr);
        return null;
      }
      
      // Process the output
      const output = stdout.trim();
      
      // Try to parse the JSON output
      try {
        let result = JSON.parse(output);
        
        // Check if the result indicates an error
        if (result.error) {
          if (verbose) console.error(result.error);
          return null;
        }
        
        // Convert to array if it's not already (single window case)
        if (!Array.isArray(result)) {
          result = [result];
        }
        
        // Calculate center point for each window and add to results
        result.forEach(window => {
          window.center_x = window.left + Math.floor(window.width / 2);
          window.center_y = window.top + Math.floor(window.height / 2);
          
          // Calculate dimensions using different methods
          
          // 1. Raw dimensions from GetWindowRect
          window.raw_width = window.width;
          window.raw_height = window.height;
          
          // 2. DPI-adjusted dimensions
          if (window.adjusted_width && window.adjusted_height) {
            window.dpi_adjusted_width = window.adjusted_width;
            window.dpi_adjusted_height = window.adjusted_height;
          } else {
            window.dpi_adjusted_width = window.width;
            window.dpi_adjusted_height = window.height;
          }
          
          // 3. Custom-scaled dimensions (allows user to apply their own scaling factor)
          window.custom_scaled_width = Math.round(window.width * customScaleFactor);
          window.custom_scaled_height = Math.round(window.height * customScaleFactor);
          
          // 4. Determine which dimensions to use as the "actual" dimensions
          // If a custom scale factor is provided, use the custom-scaled dimensions
          if (customScaleFactor !== 1.0) {
            window.actual_width = window.custom_scaled_width;
            window.actual_height = window.custom_scaled_height;
            window.scaling_method = "custom";
          } 
          // Otherwise, use the DPI-adjusted dimensions if available
          else if (window.adjusted_width && window.adjusted_height) {
            window.actual_width = window.dpi_adjusted_width;
            window.actual_height = window.dpi_adjusted_height;
            window.scaling_method = "dpi";
          } 
          // Fall back to raw dimensions if no scaling is available
          else {
            window.actual_width = window.raw_width;
            window.actual_height = window.raw_height;
            window.scaling_method = "none";
          }
        });
        
        return result;
      } catch (jsonError) {
        if (verbose) {
          console.error('Error parsing JSON:', jsonError);
          console.error('Raw output:', output);
        }
        
        // Fallback to regex extraction - this is more complex with multiple windows
        // For simplicity, we'll just try to extract a single window in this fallback case
        if (verbose) console.log('Attempting fallback regex extraction for a single window');
        
        const position = {};
        const fields = ['left', 'top', 'right', 'bottom', 'width', 'height'];
        
        for (const field of fields) {
          const match = output.match(new RegExp(`"${field}"\\s*:\\s*(\\d+)`, 'i'));
          if (match) {
            position[field.toLowerCase()] = parseInt(match[1], 10);
          }
        }
        
        if (Object.keys(position).length > 0) {
          // Calculate center point if we have enough data
          if (position.left !== undefined && position.top !== undefined && 
              position.width !== undefined && position.height !== undefined) {
            position.center_x = position.left + Math.floor(position.width / 2);
            position.center_y = position.top + Math.floor(position.height / 2);
            position.monitor_id = 1; // Assume first monitor in fallback case
          }
          return [position]; // Return as array for consistency
        } else {
          return null;
        }
      }
    } catch (execError) {
      if (verbose) console.error('Error executing PowerShell command:', execError);
      // Clean up the temporary file if there was an error
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      return null;
    }
  }
  
  /**
   * Prints formatted information about the camera window positions
   * @param {Object} options - Optional configuration parameters
   * @param {boolean} options.verbose - Whether to log detailed information (default: false)
   * @param {number} options.customScaleFactor - Custom scaling factor to apply to dimensions (default: 1.0)
   * @returns {Promise<void>}
   */
  async printCameraPositionInfo(options = {}) {
    console.log('Getting Camera window positions across all monitors...');
    
    const windowPositions = await this.getCameraWindowPosition(options);
    
    if (windowPositions && windowPositions.length > 0) {
      console.log(`Found ${windowPositions.length} Camera window(s):`);
      
      windowPositions.forEach((windowPosition, index) => {
        console.log(`\n--- Camera Window #${index + 1} (Monitor ${windowPosition.monitor_id || index + 1}) ---`);
        
        for (const [key, value] of Object.entries(windowPosition)) {
          console.log(`${key}: ${value}`);
        }
        
        console.log('\nFor use in your code:');
        console.log(`left = ${windowPosition.left}`);
        console.log(`top = ${windowPosition.top}`);
        console.log(`width = ${windowPosition.width}`);
        console.log(`height = ${windowPosition.height}`);
        
        console.log(`\nDimension Information:`);
        console.log(`Raw dimensions: ${windowPosition.raw_width} x ${windowPosition.raw_height}`);
        
        if (windowPosition.dpi) {
          console.log(`DPI: ${windowPosition.dpi} (Scale: ${windowPosition.dpi_scale.toFixed(2)})`);
          console.log(`DPI-adjusted dimensions: ${windowPosition.dpi_adjusted_width} x ${windowPosition.dpi_adjusted_height}`);
        }
        
        if (windowPosition.custom_scaled_width) {
          console.log(`Custom-scaled dimensions: ${windowPosition.custom_scaled_width} x ${windowPosition.custom_scaled_height}`);
        }
        
        console.log(`Actual dimensions (${windowPosition.scaling_method} scaling): ${windowPosition.actual_width} x ${windowPosition.actual_height}`);
        
        const left = windowPosition.left || 0;
        const top = windowPosition.top || 0;
        const width = windowPosition.actual_width || windowPosition.width || 0;
        const height = windowPosition.actual_height || windowPosition.height || 0;
        
        console.log(`\nCamera window is at position (${left}, ${top}) with size ${width} x ${height}`);
        console.log(`The center of the window is at (${left + Math.floor(width/2)}, ${top + Math.floor(height/2)})`);
      });
    } else {
      console.log('Could not get Camera window position');
    }
  }
}

module.exports = new CameraPositionModule();
