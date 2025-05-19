/**
 * test_cam_pos.js
 * Example of how to use the camera-position module with multi-monitor support
 */

// Import the camera position module
const cameraPosition = require('./camera-position');

// Example 1: Get camera positions as JSON with custom scaling factor
async function getCameraInfo() {
  try {
    // Calculate a custom scale factor to get dimensions closer to 750x750
    // Based on previous test, raw dimensions were around 515x508, so we need ~1.5x scaling
    const customScaleFactor = 1.5;
    
    const positions = await cameraPosition.getCameraWindowPosition({ 
      verbose: true,
      customScaleFactor: customScaleFactor
    });
    
    if (positions && positions.length > 0) {
      console.log(`Successfully retrieved ${positions.length} camera window position(s):`);
      console.log(JSON.stringify(positions, null, 2));
      
      // Display information for each monitor
      positions.forEach((position, index) => {
        console.log(`\n--- Monitor ${position.monitor_id || index + 1} ---`);
        console.log(`Camera window center: (${position.center_x}, ${position.center_y})`);
        console.log(`Raw position: (${position.left}, ${position.top}) with size ${position.raw_width} x ${position.raw_height}`);
        
        // Show all dimension calculations
        console.log(`\nDimension Information:`);
        
        // Show DPI-adjusted dimensions if available
        if (position.dpi) {
          console.log(`DPI: ${position.dpi} (Scale: ${position.dpi_scale.toFixed(2)})`);
          console.log(`DPI-adjusted size: ${position.dpi_adjusted_width} x ${position.dpi_adjusted_height}`);
        }
        
        // Show custom-scaled dimensions
        console.log(`Custom-scaled size (${customScaleFactor}x): ${position.custom_scaled_width} x ${position.custom_scaled_height}`);
        
        // Show the actual dimensions that should be used
        console.log(`\nActual size to use (${position.scaling_method} scaling): ${position.actual_width} x ${position.actual_height}`);
      });
    } else {
      console.log('Camera window not found or could not retrieve position.');
    }
  } catch (error) {
    console.error('Error getting camera position:', error);
  }
}

// Example 2: Using the utility method to print formatted information
async function printFormattedInfo() {
  // Use the same custom scale factor for consistency
  await cameraPosition.printCameraPositionInfo({ customScaleFactor: 1.5 });
}

// Execute one of the examples
getCameraInfo()
  .then(() => console.log('\n=== Now running the utility print method ===\n'))
  .then(() => printFormattedInfo())
  .catch(error => console.error('Error in example:', error));
