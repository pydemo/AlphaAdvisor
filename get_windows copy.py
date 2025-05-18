import subprocess

# Simple PowerShell command to list processes
ps_command = "Get-Process | Select-Object -First 5 | ConvertTo-Json"

# Execute PowerShell command from WSL
result = subprocess.run(
    ["powershell.exe", "-Command", ps_command], 
    capture_output=True, 
    text=True
)

# Print the output
print("Return code:", result.returncode)
print("Standard output:")
print(result.stdout)
print("Error output:")
print(result.stderr)