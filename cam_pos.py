import subprocess
import json
import re

def get_camera_window_position():
    # PowerShell command to get the Camera window position
    ps_command = """
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
        
        # Get window position - suppress boolean result with Out-Null
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
        "Camera window not found" | ConvertTo-Json
    }
    """
    
    # Execute PowerShell command
    result = subprocess.run(
        ["powershell.exe", "-Command", ps_command],
        capture_output=True,
        text=True
    )
    
    # Check if there was an error
    if result.returncode != 0:
        print("Error executing PowerShell command:")
        print(result.stderr)
        return None
    
    # Process the output
    output = result.stdout.strip()
    
    # If we can't parse as JSON, try to extract the information using regex
    try:
        # Try to extract just the JSON part if there's extra output
        json_match = re.search(r'({[^{]*})', output, re.DOTALL)
        if json_match:
            json_string = json_match.group(1)
            data = json.loads(json_string)
        else:
            data = json.loads(output)
        
        # Convert all keys to lowercase for consistency
        return {k.lower(): v for k, v in data.items()}
    except json.JSONDecodeError:
        # Extract window position with regex as fallback
        position = {}
        for field in ["Left", "Top", "Right", "Bottom", "Width", "Height"]:
            match = re.search(rf'"{field}"\s*:\s*(\d+)', output, re.IGNORECASE)
            if match:
                position[field.lower()] = int(match.group(1))
        
        if position:
            return position
        else:
            print("Could not parse window position information")
            print("Raw output:", output)
            return None

# Get the Camera window position
window_position = get_camera_window_position()

# Display the results
if window_position:
    print("Camera Window Position:")
    for key, value in window_position.items():
        print(f"{key}: {value}")
    
    # If this is going to be used programmatically, here's how to access specific values
    print("\nFor use in your code:")
    print(f"left = {window_position.get('left')}")
    print(f"top = {window_position.get('top')}")
    print(f"width = {window_position.get('width')}")
    print(f"height = {window_position.get('height')}")
else:
    print("Could not get Camera window position")

# Example of how to use this in your code
print("\nExample: Accessing window coordinates in your Python code")
print("-----------------------------------------------------------")
if window_position:
    left = window_position.get('left', 0)
    top = window_position.get('top', 0)
    width = window_position.get('width', 0)
    height = window_position.get('height', 0) 
    
    print(f"Camera window is at position ({left}, {top}) with size {width} x {height}")
    print(f"The center of the window is at ({left + width//2}, {top + height//2})")