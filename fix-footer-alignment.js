const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Update Parent Container (Push to edges, lower both together equally)
const searchParent = `<div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0 40px; margin-top:10px;">`;
const replaceParent = `<div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0 15px; margin-top:10px; margin-bottom:-25px;">`;

// 2. Update Left Container (Remove uneven negative margins)
const searchLeft = `<div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 0px; margin-bottom: -15px; margin-left: -25px;">`;
const replaceLeft = `<div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 0px; margin-bottom: 0px; margin-left: 0px;">`;

// 3. Update Right Container (Remove uneven negative margins)
const searchRight = `<div style="display:flex; flex-direction:column; align-items:center; padding-bottom:0px; margin-bottom:-35px; margin-right:-30px;">`;
const replaceRight = `<div style="display:flex; flex-direction:column; align-items:center; padding-bottom:0px; margin-bottom:0px; margin-right:0px;">`;

if (serverJs.includes(searchParent)) {
    serverJs = serverJs.replace(searchParent, replaceParent);
    console.log("Updated Parent container.");
}
if (serverJs.includes(searchLeft)) {
    serverJs = serverJs.replace(searchLeft, replaceLeft);
    console.log("Updated Left container.");
}
if (serverJs.includes(searchRight)) {
    serverJs = serverJs.replace(searchRight, replaceRight);
    console.log("Updated Right container.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
