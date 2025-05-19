# Camera Snapshot API

This document describes how to use the Camera Snapshot API endpoint that allows capturing screenshots of the camera window with specified coordinates and dimensions.

## API Endpoint

```
GET /api/get_camera_snap
```

This endpoint captures a screenshot of the camera window at the specified coordinates and with the specified dimensions, then returns the image directly.

### Query Parameters

| Parameter | Type    | Description                                   | Default |
|-----------|---------|-----------------------------------------------|---------|
| left      | integer | X position from the left edge of the screen   | 0       |
| top       | integer | Y position from the top edge of the screen    | 0       |
| width     | integer | Width of the capture area in pixels           | 1024    |
| height    | integer | Height of the capture area in pixels          | 768     |
| directory | string  | Directory to save the image on the server (relative to server.js). If provided, the image will be saved on the server in addition to being returned in the response. | None (image not saved) |
| filename  | string  | Filename to use when saving the image on the server. Must end with .png extension. | camera_snap_[timestamp].png |

### Response

- **Content-Type**: `image/png`
- **Body**: The captured image as binary data

If the `directory` parameter is provided, the image will also be saved on the server in the specified directory with the specified filename (or an auto-generated filename if not provided).

### Error Response

If an error occurs, the API will return a JSON response with an error message:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Usage Examples

### Node.js Example

```javascript
const http = require('http');
const fs = require('fs');

// Define the coordinates and size for the screenshot
const left = 200;
const top = 150;
const width = 1024;
const height = 768;

// Optional: specify directory and filename to save on server
const directory = 'camera_snaps';
const filename = 'my_screenshot.png';

// Construct the URL with query parameters
const url = `http://localhost:3002/api/get_camera_snap?left=${left}&top=${top}&width=${width}&height=${height}&directory=${directory}&filename=${filename}`;

// Make the HTTP request
http.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Error: Received status code ${response.statusCode}`);
    return;
  }
  
  // Create a write stream to save the image
  const fileStream = fs.createWriteStream('camera_snapshot.png');
  
  // Pipe the response data to the file
  response.pipe(fileStream);
  
  // Handle completion
  fileStream.on('finish', () => {
    console.log('Screenshot saved to camera_snapshot.png');
  });
});
```

### Browser Example

```html
<button id="captureBtn">Capture Screenshot</button>
<img id="resultImage" style="display: none;">

<script>
  document.getElementById('captureBtn').addEventListener('click', () => {
    // Define the coordinates and size for the screenshot
    const left = 200;
    const top = 150;
    const width = 1024;
    const height = 768;
    
    // Optional: specify directory and filename to save on server
    const directory = 'camera_snaps';
    const filename = `web_snap_${new Date().getTime()}.png`;
    
    // Construct the URL with query parameters and add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const url = `/api/get_camera_snap?left=${left}&top=${top}&width=${width}&height=${height}&directory=${directory}&filename=${filename}&_t=${timestamp}`;
    
    // Set the image source to the API URL
    const img = document.getElementById('resultImage');
    img.src = url;
    img.style.display = 'block';
  });
</script>
```

## Testing the API

Two test files are provided to help you test the API:

1. **test_camera_snap_api.js**: A Node.js script that makes a request to the API and saves the result to a file.
   
   Run it with:
   ```
   node test_camera_snap_api.js
   ```

2. **camera_snap_test.html**: A web page with a form that lets you specify coordinates and dimensions, then displays the captured image.
   
   Open it in your browser after starting the server:
   ```
   http://localhost:3002/camera_snap_test.html
   ```

## Implementation Details

The API uses the `screen-capture.js` module to take screenshots. This module:

1. Brings the camera window to the foreground using the window-manager.js module
2. Uses PowerShell to capture the screenshot at the specified coordinates
3. Saves the screenshot to a file
4. Reads the file and returns it to the client
5. If no directory parameter was provided, deletes the temporary file
6. If a directory parameter was provided, keeps the file in the specified directory

### Saving Images on the Server

When you provide the `directory` parameter, the API will:

1. Create the directory if it doesn't exist (relative to the server.js file)
2. Save the captured image in that directory with the specified filename
3. Still return the image in the response

This is useful when you want to keep a record of the captured images on the server.

The implementation is designed to work on Windows systems with PowerShell available.
