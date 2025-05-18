import subprocess
import json
import os
import time

# Check if the script ran by first writing a status file
subprocess.run(["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", "/mnt/c/temp/find_camera.ps1"])

# Wait a moment for files to be written
time.sleep(1)

# Check if the status file exists
if os.path.exists("/mnt/c/temp/script_status.txt"):
    with open("/mnt/c/temp/script_status.txt", "r") as f:
        status = f.read().strip()
        print(f"PowerShell script status: {status}")
else:
    print("PowerShell script did not create status file")

# Try to read the camera window information
camera_file = "/mnt/c/temp/camera_window.json"
if os.path.exists(camera_file):
    try:
        with open(camera_file, "r") as f:
            content = f.read()
            print("File content length:", len(content))
            if content.strip():
                windows = json.loads(content)
                if windows:
                    for window in windows:
                        print(f"Camera window found: {window['title']}")
                        print(f"Position: Left={window['left']}, Top={window['top']}, Width={window['width']}, Height={window['height']}")
                else:
                    print("No Camera windows found")
            else:
                print("JSON file is empty")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        with open(camera_file, "r") as f:
            print("Raw file content:")
            print(f.read())
else:
    print(f"Camera window info file not found: {camera_file}")

# Alternative approach: use PowerShell to directly list processes
ps_command = "Get-Process | Where-Object { $_.MainWindowTitle -like '*Camera*' } | Select-Object Name, MainWindowTitle, MainWindowHandle | ConvertTo-Json"
result = subprocess.run(
    ["powershell.exe", "-Command", ps_command],
    capture_output=True,
    text=True
)

print("\nDirect PowerShell output:")
if result.stdout.strip():
    try:
        camera_processes = json.loads(result.stdout)
        if isinstance(camera_processes, dict):
            # Single result
            print(f"Camera process: {camera_processes.get('Name', 'Unknown')}")
            print(f"Window title: {camera_processes.get('MainWindowTitle', 'Unknown')}")
        elif isinstance(camera_processes, list):
            # Multiple results
            for proc in camera_processes:
                print(f"Camera process: {proc.get('Name', 'Unknown')}")
                print(f"Window title: {proc.get('MainWindowTitle', 'Unknown')}")
        else:
            print("Unexpected result type")
    except json.JSONDecodeError:
        print("Could not parse JSON from process list")
        print("Raw output:", result.stdout)
else:
    print("No Camera processes found")