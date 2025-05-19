const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Test script for the /api/get_camera_snap API endpoint
 * This script makes a request to the endpoint with specified coordinates and size,
 * then saves the returned image to a file.
 */
async function testCameraSnapAPI() {
  // Define the coordinates and size for the screenshot
  const left = 200;    // X position (from left edge of screen)
  const top = 150;     // Y position (from top edge of screen)
  const width = 300;  // Width of the capture area
  const height = 768;  // Height of the capture area
  
  // Define directory and filename parameters (optional)
  const directory = 'camera_snaps';  // Directory to save the image (relative to server.js)
  const filename = `test_snap_${Date.now()}.png`;  // Filename for the image
  
  // Output path for the received image (for local saving)
  const outputPath = path.join(__dirname, 'camera_snap_api_test.png');
  
  console.log('Testing /api/get_camera_snap API endpoint...');
  console.log(`Requesting capture with: left=${left}, top=${top}, width=${width}, height=${height}`);
  console.log(`Saving to server directory: ${directory}/${filename}`);
  
  // Construct the URL with query parameters
  const url = `http://localhost:3002/api/get_camera_snap?left=${left}&top=${top}&width=${width}&height=${height}&directory=${directory}&filename=${filename}`;
  
  // Make the HTTP request
  http.get(url, (response) => {
    console.log(`Response status code: ${response.statusCode}`);
    
    // Check if the response is successful
    if (response.statusCode !== 200) {
      console.error(`Error: Received status code ${response.statusCode}`);
      response.on('data', (chunk) => {
        console.error('Error response:', chunk.toString());
      });
      return;
    }
    
    // Check if the content type is an image
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`Error: Expected image content type, got ${contentType}`);
      response.on('data', (chunk) => {
        console.error('Error response:', chunk.toString());
      });
      return;
    }
    
    // Create a write stream to save the image
    const fileStream = fs.createWriteStream(outputPath);
    
    // Pipe the response data to the file
    response.pipe(fileStream);
    
    // Handle completion
    fileStream.on('finish', () => {
      console.log(`Success! Screenshot saved to: ${outputPath}`);
    });
    
    // Handle errors
    fileStream.on('error', (err) => {
      console.error('Error saving the file:', err);
    });
  }).on('error', (err) => {
    console.error('Error making the request:', err);
  });
}

// Run the test
testCameraSnapAPI();
