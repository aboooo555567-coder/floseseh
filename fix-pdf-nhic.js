const fs = require('fs');

const fileContent = fs.readFileSync('server.js', 'utf8');

const startTag = '<!-- Bottom Footer Row: Time/Date & NHIC Logo -->';
const endTag = '<!-- ===== FOOTER ===== END (implicit) -->'; // Just an idea, let's use indexOf properly.

const startIndex = fileContent.indexOf(startTag);
const afterFooterDivIndex = fileContent.indexOf('</div>\n</div>\n</body>');

if (startIndex === -1 || afterFooterDivIndex === -1) {
    console.error("Could not find tags.");
    process.exit(1);
}

const before = fileContent.substring(0, startIndex);
const after = fileContent.substring(afterFooterDivIndex);

const newRow = `<!-- Bottom Footer Row: Time/Date & NHIC Logo -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0 40px; margin-top:10px;">
      
      <!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 25px;">
        <p style="margin:0 0 10px 0;">\${d.time || ''}</p>
        <p style="margin:0;">\${d.dayDate || ''}</p>
      </div>

      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:10px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:12.5px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#009CDE; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Arial',sans-serif; color:#009CDE; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>
      
    </div>
    
  </div>

  `;

fs.writeFileSync('server.js', before + newRow + after, 'utf8');
console.log('NHIC logo alignment and colors updated.');
