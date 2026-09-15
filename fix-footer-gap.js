const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Change main footer margin-top from 25px to 10px
serverJs = serverJs.replace('<div style="margin-top:25px;">', '<div style="margin-top:10px;">');

// 2. Change Top Footer Row margin-top from 10px to 0px
serverJs = serverJs.replace('<div style="display:flex; justify-content:center; align-items:flex-start; height:180px; margin-top: 10px;">', '<div style="display:flex; justify-content:center; align-items:flex-start; height:180px; margin-top: 0px;">');

// 3. Change Right (MOH) section padding-top from 5px to 0px
serverJs = serverJs.replace('<div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:15px; padding-top: 5px;">', '<div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:15px; padding-top: 0px;">');

// 4. Change QR code margin-top from 15px to 10px to keep it aligned relative to the taller MOH logo
serverJs = serverJs.replace('<div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; margin-top: 15px;">', '<div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; margin-top: 10px;">');

// 5. Change Divider margin-top from 25px to 20px
serverJs = serverJs.replace('<div style="width:1px; background-color:#cccccc; height:130px; margin-top: 25px;"></div>', '<div style="width:1px; background-color:#cccccc; height:130px; margin-top: 20px;"></div>');

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated footer spacing.");
