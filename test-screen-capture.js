const screenCapture = require('./screen-capture');

/**
 * Simple test script to demonstrate the screen-capture.js library
 */
async function main() {
  // Window title to bring to foreground
  const windowTitle = 'Camera';
  
  // Output path for the screenshot
  const outputPath = './camera_test_screenshot.png';
  
  // Define the coordinates for the screenshot
  const left = 200;    // X position (from left edge of screen)
  const top = 150;     // Y position (from top edge of screen)
  const width = 1024;  // Width of the capture area
  const height = 768;  // Height of the capture area
  
  console.log(`Taking screenshot of "${windowTitle}" window...`);
  console.log(`Capture area: left=${left}, top=${top}, width=${width}, height=${height}`);
  
  try {
    // Capture the screenshot
    const success = await screenCapture.captureScreenshotWithCoordinates(
      windowTitle,
      outputPath,
      left,
      top,
      width,
      height
    );
    
    if (success) {
      console.log(`Test completed successfully! Screenshot saved to: ${outputPath}`);
    } else {
      console.error('Test failed: Screenshot capture returned false');
    }
  } catch (error) {
    console.error('Test failed with an error:', error);
  }
}

// Run the test
main().catch(error => {
  console.error('An unhandled error occurred:', error);
});
