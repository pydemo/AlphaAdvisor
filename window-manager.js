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

/**
 * Brings a window with the specified title to the foreground
 * @param {string} windowTitle - The title of the window to focus
 * @returns {Promise<boolean>} Success status
 */
async function bringWindowToForeground(windowTitle = 'Camera') {
  console.log(`Bringing "${windowTitle}" window to the foreground...`);
  
  // First get the window position to obtain the handle
  const windowPosition = await getWindowPosition(windowTitle);
  
  if (!windowPosition) {
    console.error(`Window with title "${windowTitle}" not found`);
    return false;
  }
  
  // Focus the window
  const focusSuccess = await focusWindow(windowPosition.handle);
  
  if (focusSuccess) {
    console.log('Window focused successfully');
    return true;
  } else {
    console.warn('Failed to focus window');
    return false;
  }
}

module.exports = {
  getWindowPosition,
  focusWindow,
  minimizeWindow,
  restoreWindow,
  bringWindowToForeground
};
