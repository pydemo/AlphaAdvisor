from flask import Flask, jsonify
from flask_cors import CORS
import logging
import traceback
import os
import sys

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/get_camera_info', methods=['GET'])
def get_camera_info():
    try:
        # Check if we're on Windows
        is_windows = sys.platform == 'win32'
        logger.info(f"System platform: {sys.platform}")
        logger.info(f"Is Windows: {is_windows}")
        
        if not is_windows:
            return jsonify({
                "success": False,
                "message": "Camera window detection is only available on Windows platforms. Your system is detected as: " + sys.platform,
                "cameraWindows": []
            })

        # Try to import the required modules
        try:
            logger.info("Attempting to import pygetwindow and win32gui")
            import pygetwindow as gw
            import win32gui
            logger.info("Successfully imported pygetwindow and win32gui")
        except ImportError as e:
            logger.error(f"Required modules not available: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Camera detection requires pygetwindow and pywin32 packages. Please install them with: pip install pygetwindow pywin32",
                "error": str(e),
                "cameraWindows": []
            })

        # Find camera windows
        camera_windows = []
        
        # Get all windows with "Camera" in the title
        windows = gw.getWindowsWithTitle("Camera")
        if not windows:
            logger.info("Camera app not found. Make sure it's running.")
            return jsonify({
                "success": False,
                "message": "No camera windows found",
                "cameraWindows": []
            })

        for window in windows:
            if window.title.lower().startswith("camera"):
                hwnd = window._hWnd
                rect = win32gui.GetWindowRect(hwnd)
                x, y, right, bottom = rect
                width = right - x
                height = bottom - y

                logger.info(f"Window Handle (HWND): {hwnd}")
                logger.info(f"Title: {window.title}")
                logger.info(f"Position: ({x}, {y})")
                logger.info(f"Size: {width} x {height}")
                
                # Add camera window info to results array
                camera_windows.append({
                    "hwnd": str(hwnd),
                    "title": window.title,
                    "position": {
                        "left": x,
                        "top": y
                    },
                    "size": {
                        "width": width,
                        "height": height
                    }
                })

        # Return the results
        if camera_windows:
            return jsonify({
                "success": True,
                "message": "Camera windows found",
                "cameraWindows": camera_windows
            })
        else:
            return jsonify({
                "success": False,
                "message": "No camera windows found with expected title",
                "cameraWindows": []
            })
            
    except Exception as e:
        logger.error(f"CAMERA DETECTION ERROR: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 3003))
    app.run(host='0.0.0.0', port=port, debug=True)
    print(f"Server running on http://localhost:{port}")
