const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Increase container height
const searchContainer = `align-items:flex-start; height:180px; margin-top: 0px;">`;
const replaceContainer = `align-items:flex-start; height:195px; margin-top: 0px;">`;

// 2. Increase divider height
const searchDivider = `<!-- Center Vertical Divider -->
      <div style="width:1px; background-color:#cccccc; height:150px; margin-top: 5px;"></div>`;
const replaceDivider = `<!-- Center Vertical Divider -->
      <div style="width:1px; background-color:#cccccc; height:185px; margin-top: 5px;"></div>`;

if (serverJs.includes(searchContainer)) {
    serverJs = serverJs.replace(searchContainer, replaceContainer);
    console.log("Updated container height to 195px.");
} else {
    console.log("Could not find container string.");
}

if (serverJs.includes(searchDivider)) {
    serverJs = serverJs.replace(searchDivider, replaceDivider);
    console.log("Updated divider height to 185px.");
} else {
    console.log("Could not find divider string.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
