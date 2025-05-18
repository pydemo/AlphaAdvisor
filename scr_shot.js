const screenshot = require('node-screenshot');

// Capture a specific area of the screen
screenshot({
  filename: 'screenshot.png',
  x: 100,       // x coordinate of the top-left corner
  y: 100,       // y coordinate of the top-left corner
  width: 500,   // width of the area to capture
  height: 300   // height of the area to capture
})
.then(imgPath => {
  console.log(`Screenshot saved to: ${imgPath}`);
})
.catch(err => {
  console.error('Error taking screenshot:', err);
});