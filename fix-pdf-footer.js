const fs = require('fs');

const fileContent = fs.readFileSync('server.js', 'utf8');

const startTag = '<!-- ===== FOOTER ===== -->';
const endTag = '</body>';

const startIndex = fileContent.indexOf(startTag);
const endIndex = fileContent.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find footer tags.");
    process.exit(1);
}

const beforeFooter = fileContent.substring(0, startIndex);
const afterFooter = fileContent.substring(endIndex);

const newFooter = `<!-- ===== FOOTER ===== -->
  <div style="margin-top:25px;">
    
    <!-- Top Footer Row: QR/Text | Divider | MOH/Hospital -->
    <div style="display:flex; justify-content:center; align-items:center; height:180px;">
      
      <!-- Left: QR Code + Text -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=\${encodeURIComponent("https://www.seha.sa/#/inquiries/slenquiry")}" style="width:95px;height:95px;margin-bottom:8px;">
        <p style="font-size:10px;font-weight:bold;font-family:'Tajawal',sans-serif;text-align:center;margin:0 0 2px 0;line-height:1.4;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:9px;color:#333;text-align:center;margin:0 0 2px 0;font-style:italic;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;text-align:center;margin:0;"><a href="https://www.seha.sa/#/inquiries/slenquiry" style="color:#0000EE;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>
      </div>

      <!-- Center Vertical Divider -->
      <div style="width:1px; background-color:#cccccc; height:150px;"></div>

      <!-- Right: MOH Logo + Hospital Name -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:15px;">
        <img src="\${mohLogo}" style="height:90px;object-fit:contain;margin-bottom:8px;">
        <h3 style="font-size:12px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 3px 0;color:#000;">\${d.hospitalAr || ''}</h3>
        <h4 style="font-size:11px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;">\${d.hospitalEn || ''}</h4>
        \${d.licenseNumber ? \`<p style="font-size:10px;color:#555;margin:0;">رقم الترخيص : \${d.licenseNumber}</p>\` : ''}
      </div>

    </div>

    <!-- Bottom Footer Row: Time/Date & NHIC Logo -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0 40px; margin-top:10px;">
      
      <!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 25px;">
        <p style="margin:0 0 10px 0;">\${d.time || ''}</p>
        <p style="margin:0;">\${d.dayDate || ''}</p>
      </div>

      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; width:220px; padding-bottom:10px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="\${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:12.5px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#009CDE; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Arial',sans-serif; color:#1A365D; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>
      
    </div>
    
  </div>

  </div>
</div>
`;

fs.writeFileSync('server.js', beforeFooter + newFooter + afterFooter, 'utf8');
console.log('Footer layout updated successfully.');
