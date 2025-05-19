const windowManager = require('./window-manager');
const screenshotLib = require('./screenshot-lib');

// Main function
async function main() {
  // Get the command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'capture';
  const windowTitle = args[1] || 'Camera';
  
  switch (command) {
    case 'focus':
      console.log(`Focusing window "${windowTitle}"...`);
      await windowManager.bringWindowToForeground(windowTitle);
      break;
    case 'minimize':
      console.log(`Minimizing window "${windowTitle}"...`);
      const windowToMinimize = await windowManager.getWindowPosition(windowTitle);
      if (windowToMinimize) {
        const success = await windowManager.minimizeWindow(windowToMinimize.handle);
        console.log(success ? 'Window minimized successfully' : 'Failed to minimize window');
      }
      break;
    case 'restore':
      console.log(`Restoring window "${windowTitle}"...`);
      const windowToRestore = await windowManager.getWindowPosition(windowTitle);
      if (windowToRestore) {
        const success = await windowManager.restoreWindow(windowToRestore.handle);
        console.log(success ? 'Window restored successfully' : 'Failed to restore window');
      }
      break;
    case 'capture':
      // Default output file path in current directory
      const outputPath = args[2] || `./${windowTitle.replace(/[^a-z0-9]/gi, '_')}_screenshot.png`;
      const bringToFront = args[3] !== 'false'; // Default is true
      await screenshotLib.captureWindowScreenshot(windowTitle, outputPath, bringToFront);
      break;
    case 'info':
      const windowPosition = await windowManager.getWindowPosition(windowTitle);
      if (windowPosition) {
        console.log(`Window "${windowTitle}" information:`);
        for (const [key, value] of Object.entries(windowPosition)) {
          console.log(`${key}: ${value}`);
        }
        console.log(`\nWindow is ${windowPosition.is_minimized ? 'minimized' : 'not minimized'}`);
      } else {
        console.log(`Window "${windowTitle}" not found`);
      }
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands:');
      console.log('  focus [window_title] - Bring a window to the foreground');
      console.log('  minimize [window_title] - Minimize a window');
      console.log('  restore [window_title] - Restore a minimized window');
      console.log('  capture [window_title] [output_path] [bring_to_front] - Capture a screenshot of a window');
      console.log('  info [window_title] - Get information about a window');
  }
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
});
