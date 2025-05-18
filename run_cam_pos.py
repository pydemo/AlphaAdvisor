#!/usr/bin/env python3
"""
Wrapper script for cam_pos.py that checks the platform and provides a helpful message if it's not Windows.
"""

import sys
import os

def main():
    """Run cam_pos.py if on Windows, otherwise show a helpful message."""
    if sys.platform == 'win32':
        # We're on Windows, so run cam_pos.py
        print("Running cam_pos.py on Windows...")
        try:
            # Use the exec function to run the code in cam_pos.py
            with open('cam_pos.py', 'r') as f:
                code = compile(f.read(), 'cam_pos.py', 'exec')
                exec(code, globals())
        except Exception as e:
            print(f"Error running cam_pos.py: {str(e)}")
    else:
        # We're not on Windows, so show a helpful message
        print(f"Error: This script requires Windows to run.")
        print(f"Your system is detected as: {sys.platform}")
        print("\nIMPORTANT: You are running this script in a non-Windows environment.")
        print("The camera window detection functionality requires a native Windows environment.")
        print("Please run this script on a Windows system to use the camera window detection functionality.")

if __name__ == "__main__":
    main()
