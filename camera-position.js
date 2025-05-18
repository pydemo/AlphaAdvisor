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
   * Gets the position and size of the Camera window
   * @param {Object} options - Optional configuration parameters
   * @param {boolean} options.verbose - Whether to log detailed information (default: false)
   * @returns {Promise<Object|null>} Window position information or null if not found
   */
  async getCameraWindowPosition(options = {}) {
    const { verbose = false } = options;
    
    if (verbose) console.log('Getting Camera window position...');
    
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
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

# Find the Camera process
$cameraProcess = Get-Process | Where-Object { $_.MainWindowTitle -eq 'Camera' } | Select-Object -First 1

if ($cameraProcess -and $cameraProcess.MainWindowHandle -ne 0) {
    $handle = $cameraProcess.MainWindowHandle
    $rect = New-Object Win32+RECT
    
    # Get window position - suppress boolean result
    [void][Win32]::GetWindowRect([IntPtr]$handle, [ref]$rect)
    
    # Return window info as JSON
    @{
        "process_name" = $cameraProcess.Name
        "window_title" = $cameraProcess.MainWindowTitle
        "handle" = $handle
        "left" = $rect.Left
        "top" = $rect.Top
        "right" = $rect.Right
        "bottom" = $rect.Bottom
        "width" = ($rect.Right - $rect.Left)
        "height" = ($rect.Bottom - $rect.Top)
    } | ConvertTo-Json
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
        const result = JSON.parse(output);
        
        // Check if the result indicates an error
        if (result.error) {
          if (verbose) console.error(result.error);
          return null;
        }
        
        // Calculate center point and add to result
        result.center_x = result.left + Math.floor(result.width / 2);
        result.center_y = result.top + Math.floor(result.height / 2);
        
        return result;
      } catch (jsonError) {
        if (verbose) {
          console.error('Error parsing JSON:', jsonError);
          console.error('Raw output:', output);
        }
        
        // Fallback to regex extraction
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
          }
          return position;
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
   * Prints formatted information about the camera window position
   * @returns {Promise<void>}
   */
  async printCameraPositionInfo() {
    console.log('Getting Camera window position...');
    
    const windowPosition = await this.getCameraWindowPosition();
    
    if (windowPosition) {
      console.log('Camera Window Position:');
      for (const [key, value] of Object.entries(windowPosition)) {
        console.log(`${key}: ${value}`);
      }
      
      console.log('\nFor use in your code:');
      console.log(`left = ${windowPosition.left}`);
      console.log(`top = ${windowPosition.top}`);
      console.log(`width = ${windowPosition.width}`);
      console.log(`height = ${windowPosition.height}`);
      
      console.log('\nExample: Accessing window coordinates in your JavaScript code');
      console.log('-----------------------------------------------------------');
      
      const left = windowPosition.left || 0;
      const top = windowPosition.top || 0;
      const width = windowPosition.width || 0;
      const height = windowPosition.height || 0;
      
      console.log(`Camera window is at position (${left}, ${top}) with size ${width} x ${height}`);
      console.log(`The center of the window is at (${left + Math.floor(width/2)}, ${top + Math.floor(height/2)})`);
    } else {
      console.log('Could not get Camera window position');
    }
  }
}

module.exports = new CameraPositionModule();