const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Find the Time/Date container and modify its padding/margin
const search = `<!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 25px;">`;

const replace = `<!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 0px; margin-bottom: -15px; margin-left: -25px;">`;

if (serverJs.includes(search)) {
    serverJs = serverJs.replace(search, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated Time/Date position.");
} else {
    console.log("String not found!");
}
