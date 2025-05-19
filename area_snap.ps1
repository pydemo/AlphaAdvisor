const { exec } = require('child_process');
exec('powershell.exe -ExecutionPolicy Bypass -File area_snap.ps1', (err, stdout, stderr) => {
  if (err) {
    console.error(stderr);
  } else {
    console.log('Screenshot taken!');
  }
});
