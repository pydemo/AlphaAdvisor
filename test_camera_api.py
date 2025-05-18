#!/usr/bin/env python3
"""
Test script for the Camera API server.
This script makes a request to the Camera API endpoint and displays the results.
"""

import requests
import json
import sys

def test_camera_api():
    """Test the Camera API endpoint."""
    print("Testing Camera API endpoint...")
    try:
        response = requests.get('http://localhost:3003/api/get_camera_info')
        data = response.json()
        
        # Print the raw response
        print("\nRaw Response:")
        print(json.dumps(data, indent=2))
        
        # Print formatted results
        print("\nResults:")
        if data.get('success'):
            print(f"Success: {data.get('message')}")
            
            camera_windows = data.get('cameraWindows', [])
            if camera_windows:
                print(f"\nFound {len(camera_windows)} camera window(s):")
                for i, window in enumerate(camera_windows, 1):
                    print(f"\nCamera Window #{i}:")
                    print(f"  Title: {window.get('title')}")
                    print(f"  Window Handle (HWND): {window.get('hwnd')}")
                    position = window.get('position', {})
                    print(f"  Position: ({position.get('left')}, {position.get('top')})")
                    size = window.get('size', {})
                    print(f"  Size: {size.get('width')} x {size.get('height')}")
            else:
                print("No camera windows found.")
        else:
            print(f"Error: {data.get('message')}")
            if 'error' in data:
                print(f"Error details: {data.get('error')}")
            
            # Provide additional guidance if running on Linux
            if "Your system is detected as: linux" in data.get('message', ''):
                print("\nIMPORTANT: You are running this script in a Linux environment.")
                print("The camera window detection functionality requires a native Windows environment.")
                print("Please see README_camera_api.md for instructions on running this on Windows.")
                
    except requests.exceptions.ConnectionError:
        print("Error: Failed to connect to the API server.")
        print("Make sure the server is running at http://localhost:3003")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_camera_api()
