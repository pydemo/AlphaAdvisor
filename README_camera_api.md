# Camera API Server

A simple Flask-based API server that provides an endpoint to detect camera windows on Windows systems.

## Features

- `/api/get_camera_info` endpoint to detect camera windows
- Returns window handle, title, position, and size information
- Cross-origin resource sharing (CORS) enabled

## Requirements

- Python 3.6+
- Flask
- Flask-CORS
- PyGetWindow (Windows only)
- PyWin32 (Windows only)

## Installation

1. Clone this repository or download the files.

2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

Note: The Windows-specific dependencies (`pygetwindow` and `pywin32`) will only be installed on Windows systems.

## Usage

1. Start the server:

```bash
python camera_api_server.py
```

The server will run on `http://localhost:3003` by default.

2. Access the API endpoint:

- To get information about camera windows: `GET /api/get_camera_info`

Example response:

```json
{
  "success": true,
  "message": "Camera windows found",
  "cameraWindows": [
    {
      "hwnd": "12345678",
      "title": "Camera",
      "position": {
        "left": 100,
        "top": 100
      },
      "size": {
        "width": 800,
        "height": 600
      }
    }
  ]
}
```

## Notes

- This API only works on Windows systems.
- The Camera app must be running for the API to detect it.
- The API looks for windows with titles that start with "Camera".

## Important: Running on Windows

The camera window detection functionality requires a native Windows environment (not WSL or a Linux container). If you're seeing a message like:

```
"Camera window detection is only available on Windows platforms. Your system is detected as: linux"
```

This means you're running the server in a Linux environment. To use the camera window detection functionality:

1. Make sure you're running the server directly on Windows (not in WSL, Docker, or any other Linux environment)
2. Install Python for Windows
3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run the server:
   ```
   python camera_api_server.py
   ```

## Customization

- To change the port, set the `PORT` environment variable before running the server.
