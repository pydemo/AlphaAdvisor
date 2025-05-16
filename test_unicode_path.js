const http = require('http');

// Test fetching a file with Unicode characters in the path
function testUnicodePath() {
  // This path contains the Greek letter alpha (α)
  const url = 'http://localhost:3002/α7RV/Stills/1_Shooting/PAGE_1/1_Image-Quality_Rec/PAGE_1/1_JPEG_HREF-Switch/JPEG_HREF_Switch.json';
  console.log(`Fetching URL: ${url}`);
  
  http.get(url, (res) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    console.log(`Status Code: ${statusCode}`);
    console.log(`Content Type: ${contentType}`);

    let error;
    if (statusCode !== 200) {
      error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
    }

    if (error) {
      console.error(error.message);
      // Consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        console.log('Success! Response:');
        console.log(rawData.substring(0, 200) + '...'); // Show first 200 chars
      } catch (e) {
        console.error(e.message);
      }
    });
  }).on('error', (e) => {
    console.error(`HTTP request error: ${e.message}`);
  });
}

// Run the test
testUnicodePath();
