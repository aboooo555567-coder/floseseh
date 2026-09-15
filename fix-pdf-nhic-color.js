const fs = require('fs');

let fileContent = fs.readFileSync('server.js', 'utf8');

const oldNHICBlock = `      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:10px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:12.5px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#009CDE; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Arial',sans-serif; color:#009CDE; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>`;

const newNHICBlock = `      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:10px; margin-right:-18px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:12.5px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#00A99D; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Arial',sans-serif; color:#1A365D; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>`;

fileContent = fileContent.replace(oldNHICBlock, newNHICBlock);

fs.writeFileSync('server.js', fileContent, 'utf8');
console.log('NHIC logo alignment and colors updated.');
