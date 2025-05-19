// main.js
// This Node.js script executes a PowerShell script to get the Windows Camera app's window information.
// It uses PowerShell's -EncodedCommand for robust script passing.
// It should be run from a WSL/Ubuntu environment that has Node.js installed.

const { exec } = require('child_process');

// PowerShell script content
// This script finds the "WindowsCamera.exe" process, gets its main window rectangle,
// and outputs the details as a JSON string.
// PowerShell comments have been corrected to use '#' instead of '//'.
const psScriptContent = `
Add-Type @"
  // C# signature for P/Invoke to use User32.dll functions
  using System;
  using System.Runtime.InteropServices;
  public class User32 {
    // Struct to hold window rectangle coordinates
    [StructLayout(LayoutKind.Sequential)]
    public struct Rect {
      public int Left;
      public int Top;
      public int Right;
      public int Bottom;
    }

    // External function to get window rectangle
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetWindowRect(IntPtr hWnd, out Rect lpRect);
  }
"@ -ErrorAction SilentlyContinue # Suppress errors if type is already added

try {
    // Get "WindowsCamera" processes that have a main window handle
    $cameraProcesses = Get-Process -Name "WindowsCamera" -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne [System.IntPtr]::Zero}

    // Check if any such process was found
    if ($null -eq $cameraProcesses -or $cameraProcesses.Count -eq 0) {
        Write-Output (@{ Error = "Camera app (WindowsCamera.exe) not found or no active window." } | ConvertTo-Json)
        exit 0 # Exit gracefully so Node.js can parse the JSON error
    }

    $foundWindowInfo = $null
    // Iterate over found processes
    foreach ($process in $cameraProcesses) {
        $hwnd = $process.MainWindowHandle # Get the window handle
        $rect = New-Object User32.Rect   # Create a new Rect object

        // Call GetWindowRect to populate the rect object
        if ([User32]::GetWindowRect($hwnd, [ref]$rect)) {
            // Check if the window has valid dimensions (not zero width or height)
            if (($rect.Right - $rect.Left) -ne 0 -and ($rect.Bottom - $rect.Top) -ne 0) {
                $foundWindowInfo = @{
                    ProcessId = $process.Id
                    MainWindowTitle = $process.MainWindowTitle
                    Left = $rect.Left
                    Top = $rect.Top
                    Right = $rect.Right
                    Bottom = $rect.Bottom
                    Width = $rect.Right - $rect.Left
                    Height = $rect.Bottom - $rect.Top
                }
                break # Found a suitable window
            }
        }
    }

    if ($foundWindowInfo -ne $null) {
        // Output the found window information as JSON
        $foundWindowInfo | ConvertTo-Json
    } else {
        // Output a JSON error if window dimensions could not be retrieved
        Write-Output (@{ Error = "Camera app found, but could not retrieve window dimensions. The window might be minimized, not fully rendered, or have no standard window frame." } | ConvertTo-Json)
    }

} catch {
    // Catch any unexpected PowerShell errors
    $ErrorDetails = @{
        Error = "An unexpected PowerShell error occurred."
        ExceptionMessage = $_.Exception.Message
        FullError = $_.ToString()
    }
    // Output the error details as JSON
    Write-Output ($ErrorDetails | ConvertTo-Json)
}
`;

// Encode the PowerShell script to Base64 (UTF-16LE, as expected by -EncodedCommand)
const encodedPsScript = Buffer.from(psScriptContent, 'utf16le').toString('base64');

// Construct the command to execute PowerShell using -EncodedCommand
// -NoProfile: Skips loading the user's PowerShell profile.
// -ExecutionPolicy Bypass: Bypasses the execution policy for this command.
// -EncodedCommand: Executes the Base64-encoded script.
const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${encodedPsScript}"`;

console.log("Attempting to get Camera app window information via PowerShell (using EncodedCommand, comments fixed)...");

// Execute the PowerShell command
exec(command, (error, stdout, stderr) => {
    // Handle errors from executing the command itself (e.g., powershell.exe not found)
    if (error) {
        console.error(`Error executing PowerShell: ${error.message}`);
        if (stderr) {
            // stderr from PowerShell might contain more specific errors from powershell.exe itself
            console.error(`PowerShell Stderr: ${stderr}`);
        }
        // For debugging, you might want to see the command if it's not too long
        // Be cautious with logging potentially very long encoded strings in production
        if (command.length < 1024) { // Arbitrary limit to avoid flooding console
            console.error(`Failed command (first part if too long): ${command.substring(0, 200)}...`);
        } else {
            console.error(`Failed command was too long to display (Encoded Script).`);
        }
        return;
    }

    // PowerShell might write warnings or informational messages to stderr,
    // even if the script itself completes its primary task.
    if (stderr && stderr.trim() !== "") {
        console.warn(`PowerShell Stderr (may contain warnings or non-fatal errors): ${stderr.trim()}`);
    }

    // Try to parse the standard output from PowerShell as JSON
    try {
        const output = stdout.trim();
        if (!output) {
            // This can occur if the PS script exits without writing to stdout (e.g., an early, unhandled exit)
            console.error("PowerShell script produced no standard output.");
            // If stderr had content, it might give a clue from PowerShell itself.
            if (stderr && stderr.trim() !== "") {
                console.error("Check PowerShell Stderr above for potential script-level errors from PowerShell.");
            }
            return;
        }
        const result = JSON.parse(output);

        // Check if the parsed JSON contains an Error property (set by our PowerShell script)
        if (result.Error) {
            console.error(`Error from PowerShell script: ${result.Error}`);
            if(result.ExceptionMessage) console.error(`  Details: ${result.ExceptionMessage}`);
            if(result.FullError && result.FullError !== result.ExceptionMessage) console.error(`  Full PS Error: ${result.FullError}`);
        } else if (Object.keys(result).length === 0) {
            // This case handles if JSON is empty '{}' but not an error,
            // which is unlikely with the current PS script logic if it runs correctly.
            console.log("Received empty information for Camera app window (no error explicitly reported by script). This is unexpected.");
        } else {
            // Successfully retrieved and parsed window information
            console.log("\nCamera App Window Information:");
            console.log(`  Process ID: ${result.ProcessId}`);
            console.log(`  Window Title: "${result.MainWindowTitle}"`);
            console.log(`  Position: Left=${result.Left}, Top=${result.Top}`);
            console.log(`  Size: Width=${result.Width}, Height=${result.Height}`);
            console.log(`  Coordinates: (${result.Left}, ${result.Top}) to (${result.Right}, ${result.Bottom})`);
        }
    } catch (parseError) {
        // Handle errors from parsing the JSON output
        console.error("Error parsing PowerShell output as JSON:", parseError.message);
        console.log("Raw PowerShell Stdout:", stdout);
        if (stderr && stderr.trim() !== "") {
            console.log("Raw PowerShell Stderr:", stderr.trim());
        }
    }
});
