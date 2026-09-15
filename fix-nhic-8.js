const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldBlock = `      <!-- NHIC Logo & Custom Text -->
      <div style="margin-top:5px; margin-right:-50px; margin-left:auto; display:flex; flex-direction:column; align-items:center; width:150px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:12px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#333; margin:0; line-height:1.2; text-align:center;">المركز الوطني<br>للمعلومات الصحية</h4>
        <h5 style="font-size:9px; font-weight:bold; font-family:'Arial',sans-serif; color:#666; margin:2px 0 0 0; line-height:1.2; text-align:center;">National Health<br>Information Center</h5>
      </div>`;

const newBlock = `      <!-- NHIC Logo & Custom Text -->
      <div style="margin-top:5px; margin-right:-50px; margin-left:auto; display:flex; flex-direction:column; align-items:center; width:180px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:11px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#333; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:8px; font-weight:bold; font-family:'Arial',sans-serif; color:#666; margin:2px 0 0 0; line-height:1.2; text-align:center;">National Health Information Center</h5>
      </div>`;

serverJs = serverJs.split(oldBlock).join(newBlock);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed NHIC single line text and font size');
