const fs = require('fs');

const fileContent = fs.readFileSync('server.js', 'utf8');

const startTag = '<!-- Top Footer Row: QR/Text | Divider | MOH/Hospital -->';
const endTag = '<!-- Bottom Footer Row: Time/Date & NHIC Logo -->';

const startIndex = fileContent.indexOf(startTag);
const endIndex = fileContent.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find tags.");
    process.exit(1);
}

const before = fileContent.substring(0, startIndex);
const after = fileContent.substring(endIndex);

const newRow = `<!-- Top Footer Row: QR/Text | Divider | MOH/Hospital -->
    <div style="display:flex; justify-content:center; align-items:flex-start; height:180px; margin-top: 10px;">
      
      <!-- Left: QR Code + Text -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; margin-top: 15px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=105x105&data=\${encodeURIComponent("https://www.seha.sa/#/inquiries/slenquiry")}" style="width:105px;height:105px;margin-bottom:12px;">
        <p style="font-size:10px;font-weight:bold;font-family:'Tajawal',sans-serif;text-align:center;margin:0 0 4px 0;line-height:1.4;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:8px;color:#333;text-align:center;margin:0 0 3px 0;font-style:italic; font-family: 'Arial', sans-serif;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;text-align:center;margin:0;"><a href="https://www.seha.sa/#/inquiries/slenquiry" style="color:#0000EE;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>
      </div>

      <!-- Center Vertical Divider -->
      <div style="width:1px; background-color:#cccccc; height:130px; margin-top: 25px;"></div>

      <!-- Right: MOH Logo + Hospital Name -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:15px; padding-top: 5px;">
        <img src="\${mohLogo}" style="height:100px;object-fit:contain;margin-bottom:10px;">
        <h3 style="font-size:13px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;">\${d.hospitalAr || ''}</h3>
        <h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;">\${d.hospitalEn || ''}</h4>
        \${d.licenseNumber ? \`<p style="font-size:10px;color:#555;margin:0;">رقم الترخيص : \${d.licenseNumber}</p>\` : ''}
      </div>

    </div>

    `;

fs.writeFileSync('server.js', before + newRow + after, 'utf8');
console.log('Footer spacing adjusted.');
