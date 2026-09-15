const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const search = `      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:10px; margin-right:-18px;">`;
const replace = `      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:0px; margin-bottom:-12px; margin-right:-18px;">`;

if (serverJs.includes(search)) {
    serverJs = serverJs.replace(search, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated NHIC logo position.");
} else {
    console.log("Could not find the target string.");
}
