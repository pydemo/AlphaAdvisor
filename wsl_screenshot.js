const { exec } = require('child_process');

// Define the region to capture (left, top, right, bottom)
const left = 100;
const top = 100;
const right = 900;  // left + width
const bottom = 700; // top + height
const outputFilePath = 'C:\\Users\\alexb\\Desktop\\screenshot_region.png';

console.log('Taking screenshot of a region with NirCmd...');

// Use NirCmd to capture a screen region
const command = `powershell.exe -Command "& 'C:\\Windows\\nircmd.exe' savescreenshot '${outputFilePath}' ${left} ${top} ${right - left} ${bottom - top}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  console.log(`Region screenshot saved to: ${outputFilePath}`);
});