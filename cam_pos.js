const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

/**
 * Gets the position and size of the Camera window
 * @returns {Promise<Object>} Window position information
 */
async function getCameraWindowPosition() {
  // Create a temporary PowerShell script file instead of passing the command directly
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
      console.error('PowerShell error:', stderr);
      return null;
    }
    
    // Process the output
    const output = stdout.trim();
    
    // Try to parse the JSON output
    try {
      const result = JSON.parse(output);
      
      // Check if the result indicates an error
      if (result.error) {
        console.error(result.error);
        return null;
      }
      
      return result;
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      console.error('Raw output:', output);
      
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
        return position;
      } else {
        return null;
      }
    }
  } catch (execError) {
    console.error('Error executing PowerShell command:', execError);
    // Clean up the temporary file if there was an error
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    return null;
  }
}

// Main function to run the script
async function main() {
  console.log('Getting Camera window position...');
  
  const windowPosition = await getCameraWindowPosition();
  
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

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
});