const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// The original block
const searchLeft = `      <!-- Left: QR Code + Text -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; margin-top: 10px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=\${encodeURIComponent("https://www.seha.sa/#/inquiries/slenquiry")}" style="width:60px;height:60px;margin-bottom:12px;">`;

// The new block with exact mathematical spacing to align texts
const replaceLeft = `      <!-- Left: QR Code + Text -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; padding-top: 0px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=\${encodeURIComponent("https://www.seha.sa/#/inquiries/slenquiry")}" style="width:60px;height:60px;margin-top:20px;margin-bottom:45px;">`;

if (serverJs.includes(searchLeft)) {
    serverJs = serverJs.replace(searchLeft, replaceLeft);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Successfully aligned texts perfectly on the same line.");
} else {
    console.log("Could not find the target string for Left QR container.");
}
