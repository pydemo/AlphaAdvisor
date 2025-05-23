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
 * Gets the position and size of a window by title
 * @param {string} windowTitle - The title of the window to find
 * @returns {Promise<Object>} Window position information
 */
async function getWindowPosition(windowTitle = 'Camera') {
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

# Find the window process
$windowProcess = Get-Process | Where-Object { $_.MainWindowTitle -eq '${windowTitle}' } | Select-Object -First 1

if ($windowProcess -and $windowProcess.MainWindowHandle -ne 0) {
    $handle = $windowProcess.MainWindowHandle
    $rect = New-Object Win32+RECT
    
    # Check if window is minimized (iconic)
    $isMinimized = [Win32]::IsIconic([IntPtr]$handle)
    
    # Get window position - suppress boolean result
    [void][Win32]::GetWindowRect([IntPtr]$handle, [ref]$rect)
    
    # Return window info as JSON
    @{
        "process_name" = $windowProcess.Name
        "window_title" = $windowProcess.MainWindowTitle
        "handle" = $handle
        "left" = $rect.Left
        "top" = $rect.Top
        "right" = $rect.Right
        "bottom" = $rect.Bottom
        "width" = ($rect.Right - $rect.Left)
        "height" = ($rect.Bottom - $rect.Top)
        "is_minimized" = $isMinimized
    } | ConvertTo-Json
}
else {
    "{ ""error"": ""Window not found"" }"
}
`;

  try {
    const output = await runPowerShellScript(psScript);
    
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
      return null;
    }
  } catch (error) {
    console.error('Error getting window position:', error);
    return null;
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
    
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    
    // SW_RESTORE = 9
    public const int SW_RESTORE = 9;
}
"@

# Check if window is minimized
$isMinimized = [Win32]::IsIconic([IntPtr]${handle})

# If minimized, restore it
if ($isMinimized) {
    [Win32]::ShowWindow([IntPtr]${handle}, [Win32]::SW_RESTORE) | Out-Null
}

# Bring window to foreground
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
 * Takes a screenshot of a specific window
 * @param {string} windowTitle - The title of the window to capture
 * @param {string} outputPath - The path to save the screenshot
 * @param {boolean} bringToFront - Whether to bring the window to the foreground
 * @returns {Promise<boolean>} Success status
 */
async function captureWindowScreenshot(windowTitle = 'Camera', outputPath = 'window_screenshot.png', bringToFront = true) {
  // First get the window position
  const windowPosition = await getWindowPosition(windowTitle);
  
  if (!windowPosition) {
    console.error(`Window with title "${windowTitle}" not found`);
    return false;
  }
  
  // If requested, bring window to foreground
  if (bringToFront) {
    console.log(`Bringing "${windowTitle}" window to the foreground...`);
    const focusSuccess = await focusWindow(windowPosition.handle);
    
    if (focusSuccess) {
      console.log('Window focused successfully');
      
      // Give the window a moment to be properly rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get updated position after focus
      const updatedPosition = await getWindowPosition(windowTitle);
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

/**
 * Minimizes a window
 * @param {number} handle - The window handle
 * @returns {Promise<boolean>} Success status
 */
async function minimizeWindow(handle) {
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    // SW_MINIMIZE = 6
    public const int SW_MINIMIZE = 6;
}
"@

# Minimize the window
$result = [Win32]::ShowWindow([IntPtr]${handle}, [Win32]::SW_MINIMIZE)
$result
`;

  try {
    const output = await runPowerShellScript(psScript);
    return output.trim().toLowerCase() === 'true';
  } catch (error) {
    console.error('Error minimizing window:', error);
    return false;
  }
}

/**
 * Restores a window from minimized state
 * @param {number} handle - The window handle
 * @returns {Promise<boolean>} Success status
 */
async function restoreWindow(handle) {
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    // SW_RESTORE = 9
    public const int SW_RESTORE = 9;
}
"@

# Restore the window
$result = [Win32]::ShowWindow([IntPtr]${handle}, [Win32]::SW_RESTORE)
$result
`;

  try {
    const output = await runPowerShellScript(psScript);
    return output.trim().toLowerCase() === 'true';
  } catch (error) {
    console.error('Error restoring window:', error);
    return false;
  }
}

// Main function
async function main() {
  // Get the command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'capture';
  const windowTitle = args[1] || 'Camera';
  
  switch (command) {
    case 'focus':
      console.log(`Focusing window "${windowTitle}"...`);
      const windowInfo = await getWindowPosition(windowTitle);
      if (windowInfo) {
        const success = await focusWindow(windowInfo.handle);
        console.log(success ? 'Window focused successfully' : 'Failed to focus window');
      }
      break;
    case 'minimize':
      console.log(`Minimizing window "${windowTitle}"...`);
      const windowToMinimize = await getWindowPosition(windowTitle);
      if (windowToMinimize) {
        const success = await minimizeWindow(windowToMinimize.handle);
        console.log(success ? 'Window minimized successfully' : 'Failed to minimize window');
      }
      break;
    case 'restore':
      console.log(`Restoring window "${windowTitle}"...`);
      const windowToRestore = await getWindowPosition(windowTitle);
      if (windowToRestore) {
        const success = await restoreWindow(windowToRestore.handle);
        console.log(success ? 'Window restored successfully' : 'Failed to restore window');
      }
      break;
    case 'capture':
      // Default output file path in current directory
      const outputPath = args[2] || `./${windowTitle.replace(/[^a-z0-9]/gi, '_')}_screenshot.png`;
      const bringToFront = args[3] !== 'false'; // Default is true
      await captureWindowScreenshot(windowTitle, outputPath, bringToFront);
      break;
    case 'info':
      const windowPosition = await getWindowPosition(windowTitle);
      if (windowPosition) {
        console.log(`Window "${windowTitle}" information:`);
        for (const [key, value] of Object.entries(windowPosition)) {
          console.log(`${key}: ${value}`);
        }
        console.log(`\nWindow is ${windowPosition.is_minimized ? 'minimized' : 'not minimized'}`);
      } else {
        console.log(`Window "${windowTitle}" not found`);
      }
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands:');
      console.log('  focus [window_title] - Bring a window to the foreground');
      console.log('  minimize [window_title] - Minimize a window');
      console.log('  restore [window_title] - Restore a minimized window');
      console.log('  capture [window_title] [output_path] [bring_to_front] - Capture a screenshot of a window');
      console.log('  info [window_title] - Get information about a window');
  }
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
});