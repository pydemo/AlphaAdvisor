/**
 * snap_cam_pos.js
 * Merged script: Gets current camera window position and takes a snapshot of that area.
 * Combines logic from test_cam_pos.js and 1snap.js
 */

const cameraPosition = require('./camera-position');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Brings the Camera app to the foreground before taking a snapshot
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function bringCameraToForeground() {
  // Create a temporary PowerShell script to bring camera to foreground
  const tempScriptPath = path.join(__dirname, 'temp_foreground.ps1');
  
  const foregroundScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Threading;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();
    
    [DllImport("user32.dll")]
    public static extern bool AllowSetForegroundWindow(int dwProcessId);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr ProcessId);
    
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
}
"@

function Activate-Window {
    param (
        [IntPtr]$WindowHandle
    )
    
    Write-Output "Attempting to activate window with handle: $WindowHandle"
    
    # Check if window is minimized
    $isMinimized = [Win32]::IsIconic($WindowHandle)
    Write-Output "Window is minimized: $isMinimized"
    
    # Check if window is visible
    $isVisible = [Win32]::IsWindowVisible($WindowHandle)
    Write-Output "Window is visible: $isVisible"
    
    # Get current foreground window
    $currentForeground = [Win32]::GetForegroundWindow()
    Write-Output "Current foreground window handle: $currentForeground"
    
    # Allow this process to set foreground window
    [Win32]::AllowSetForegroundWindow(-1)  # ASFW_ANY
    
    # Try multiple approaches to restore and activate the window
    
    # 1. First try ShowWindow with SW_RESTORE (9)
    Write-Output "Attempting ShowWindow with SW_RESTORE (9)"
    [Win32]::ShowWindow($WindowHandle, 9) | Out-Null
    Start-Sleep -Milliseconds 300
    
    # 2. Then try ShowWindow with SW_SHOW (5)
    Write-Output "Attempting ShowWindow with SW_SHOW (5)"
    [Win32]::ShowWindow($WindowHandle, 5) | Out-Null
    Start-Sleep -Milliseconds 300
    
    # 3. Then try ShowWindow with SW_SHOWNORMAL (1)
    Write-Output "Attempting ShowWindow with SW_SHOWNORMAL (1)"
    [Win32]::ShowWindow($WindowHandle, 1) | Out-Null
    Start-Sleep -Milliseconds 300
    
    # 4. Try BringWindowToTop
    Write-Output "Attempting BringWindowToTop"
    [Win32]::BringWindowToTop($WindowHandle) | Out-Null
    Start-Sleep -Milliseconds 300
    
    # 5. Try the thread attachment technique
    Write-Output "Attempting thread attachment technique"
    $currentThreadId = [Win32]::GetCurrentThreadId()
    $windowThreadId = [Win32]::GetWindowThreadProcessId($WindowHandle, [IntPtr]::Zero)
    $foregroundThreadId = [Win32]::GetWindowThreadProcessId($currentForeground, [IntPtr]::Zero)
    
    Write-Output "Current thread ID: $currentThreadId"
    Write-Output "Window thread ID: $windowThreadId"
    Write-Output "Foreground thread ID: $foregroundThreadId"
    
    # Attach threads
    if ($windowThreadId -ne $foregroundThreadId) {
        Write-Output "Attaching threads"
        [Win32]::AttachThreadInput($windowThreadId, $foregroundThreadId, $true) | Out-Null
        [Win32]::SetForegroundWindow($WindowHandle) | Out-Null
        [Win32]::AttachThreadInput($windowThreadId, $foregroundThreadId, $false) | Out-Null
    } else {
        Write-Output "Threads already attached, setting foreground window directly"
        [Win32]::SetForegroundWindow($WindowHandle) | Out-Null
    }
    
    # 6. Final attempt with SetForegroundWindow
    Write-Output "Final attempt with SetForegroundWindow"
    [Win32]::SetForegroundWindow($WindowHandle) | Out-Null
    
    # Check if we succeeded
    Start-Sleep -Milliseconds 500
    $newForeground = [Win32]::GetForegroundWindow()
    $success = ($newForeground -eq $WindowHandle)
    Write-Output "New foreground window handle: $newForeground"
    Write-Output "Activation success: $success"
    
    return $success
}

# Try to find the Camera window
Write-Output "Searching for Camera window..."

# First try to find by exact title "Camera"
$cameraProcess = Get-Process | Where-Object { $_.MainWindowTitle -eq 'Camera' } | Select-Object -First 1
if ($cameraProcess -and $cameraProcess.MainWindowHandle -ne 0) {
    Write-Output "Found Camera window with exact title match: '$($cameraProcess.MainWindowTitle)'"
    $hwnd = $cameraProcess.MainWindowHandle
    $success = Activate-Window -WindowHandle ([IntPtr]$hwnd)
    
    if ($success) {
        Write-Output "Successfully activated Camera window"
        exit 0
    } else {
        Write-Output "Failed to activate Camera window with exact title match, trying alternative methods..."
    }
} else {
    Write-Output "No Camera window found with exact title match"
}

# Try to find by partial title match (case-insensitive)
$cameraProcess = Get-Process | Where-Object { $_.MainWindowTitle -match '(?i)camera' } | Select-Object -First 1
if ($cameraProcess -and $cameraProcess.MainWindowHandle -ne 0) {
    Write-Output "Found Camera window with partial title match: '$($cameraProcess.MainWindowTitle)'"
    $hwnd = $cameraProcess.MainWindowHandle
    $success = Activate-Window -WindowHandle ([IntPtr]$hwnd)
    
    if ($success) {
        Write-Output "Successfully activated Camera window"
        exit 0
    } else {
        Write-Output "Failed to activate Camera window with partial title match"
    }
} else {
    Write-Output "No Camera window found with partial title match"
}

# Try to find by process name
$cameraProcesses = Get-Process | Where-Object { $_.ProcessName -match '(?i)camera' -or $_.ProcessName -eq 'WindowsCamera' }
if ($cameraProcesses -and $cameraProcesses.Count -gt 0) {
    Write-Output "Found $($cameraProcesses.Count) potential Camera processes by name"
    
    foreach ($proc in $cameraProcesses) {
        if ($proc.MainWindowHandle -ne 0) {
            Write-Output "Trying to activate Camera process: $($proc.ProcessName) with title: '$($proc.MainWindowTitle)'"
            $hwnd = $proc.MainWindowHandle
            $success = Activate-Window -WindowHandle ([IntPtr]$hwnd)
            
            if ($success) {
                Write-Output "Successfully activated Camera window"
                exit 0
            }
        }
    }
    Write-Output "Failed to activate any Camera process windows"
} else {
    Write-Output "No Camera processes found by name"
}

# Try to launch the Camera app if it's not found
Write-Output "Attempting to launch Camera app..."
try {
    Start-Process "microsoft.windows.camera:"
    Start-Sleep -Seconds 3
    
    # Try again to find and activate the Camera window
    $cameraProcess = Get-Process | Where-Object { $_.MainWindowTitle -eq 'Camera' -or $_.MainWindowTitle -match '(?i)camera' } | Select-Object -First 1
    if ($cameraProcess -and $cameraProcess.MainWindowHandle -ne 0) {
        Write-Output "Found Camera window after launch: '$($cameraProcess.MainWindowTitle)'"
        $hwnd = $cameraProcess.MainWindowHandle
        $success = Activate-Window -WindowHandle ([IntPtr]$hwnd)
        
        if ($success) {
            Write-Output "Successfully activated Camera window after launch"
            exit 0
        }
    }
} catch {
    Write-Output "Error launching Camera app: $_"
}

# If we get here, we failed to activate any Camera window
Write-Output "Failed to find and activate any Camera window"
exit 1
`;

  // Write the script to a temporary file
  fs.writeFileSync(tempScriptPath, foregroundScript);

  try {
    // Execute the PowerShell script
    const { stdout, stderr } = await execPromise(`powershell.exe -ExecutionPolicy Bypass -File "${tempScriptPath}"`);
    console.log(stdout);
    
    if (stderr) {
      console.error('PowerShell error:', stderr);
    }
    
    // Clean up the temporary file
    fs.unlinkSync(tempScriptPath);
    
    // Give the window time to fully activate and stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return stdout.includes("Successfully activated Camera window");
  } catch (error) {
    console.error('Error bringing camera to foreground:', error);
    // Clean up the temporary file if there was an error
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    return false;
  }
}

/**
 * Launches the Camera app if it's not already running
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function launchCameraApp() {
  console.log('Attempting to launch Camera app...');
  
  try {
    // Use PowerShell to launch the Camera app (works in WSL)
    await execPromise('powershell.exe -Command "Start-Process microsoft.windows.camera:"');
    
    // Wait for the app to launch
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return true;
  } catch (error) {
    console.error('Error launching Camera app:', error);
    return false;
  }
}

async function main() {
  try {
    // First check if we need to launch the Camera app
    const launchResult = await launchCameraApp();
    console.log(`Camera app launch ${launchResult ? 'successful' : 'may have failed, continuing anyway'}`);
    
    // Then bring camera app to foreground
    console.log('Attempting to bring Camera app to foreground...');
    const foregroundSuccess = await bringCameraToForeground();
    
    if (!foregroundSuccess) {
      console.log('Warning: Could not bring Camera app to foreground. Continuing anyway...');
    }
    
    // Wait a moment for the window to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
