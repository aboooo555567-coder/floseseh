const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const newNhicBlock = `      <!-- NHIC Logo & Custom Text -->
      <div style="text-align:center; margin-top:5px; margin-right:-30px; display:flex; flex-direction:column; align-items:center;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 4px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:14px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#333; margin:0; line-height:1.2; text-align:center;">المركز الوطني<br>للمعلومات الصحية</h4>
      </div>`;

// Replace the old NHIC block
serverJs = serverJs.replace(
    /      <!-- NHIC Logo -->[\s\S]*?<img src="\$\{nhicLogo\}" style="height:140px;">\n      <\/div>/g,
    newNhicBlock
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Replaced NHIC logo with cropped version + HTML text');
