/**
 * example-usage.js
 * Example of how to use the camera-position module
 */

// Import the camera position module
const cameraPosition = require('./camera-position');

// Example 1: Get camera position as JSON
async function getCameraInfo() {
  try {
    const position = await cameraPosition.getCameraWindowPosition({ verbose: true });
    
    if (position) {
      console.log('Camera position successfully retrieved:');
      console.log(JSON.stringify(position, null, 2));
      
      // You can work with individual properties
      console.log(`\nThe camera window center is at (${position.center_x}, ${position.center_y})`);
    } else {
      console.log('Camera window not found or could not retrieve position.');
    }
  } catch (error) {
    console.error('Error getting camera position:', error);
  }
}

// Example 2: Using the utility method to print formatted information
async function printFormattedInfo() {
  await cameraPosition.printCameraPositionInfo();
}

// Execute one of the examples
getCameraInfo()
  .then(() => console.log('\n=== Now running the utility print method ===\n'))
  .then(() => printFormattedInfo())
  .catch(error => console.error('Error in example:', error));