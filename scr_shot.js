const screenCapture = require('./screen-capture');

// Main function
async function main() {
  // Get the command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'capture';
  const windowTitle = args[1] || 'Camera';
  
  // Define the coordinates in main function
  const left = 200;    // X position (from left edge of screen)
  const top = 150;     // Y position (from top edge of screen)
  const width = 1024;  // Width of the capture area
  const height = 768;  // Height of the capture area
  
  switch (command) {
    case 'capture':
      // Default output file path in current directory
      const outputPath = args[2] || `./${windowTitle.replace(/[^a-z0-9]/gi, '_')}_screenshot.png`;
      await screenCapture.captureScreenshotWithCoordinates(
        windowTitle, 
        outputPath,
        left,
        top,
        width,
        height
      );
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands:');
      console.log('  capture [window_title] [output_path] - Capture a screenshot with specified coordinates');
  }
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
});
