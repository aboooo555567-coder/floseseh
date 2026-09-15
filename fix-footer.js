const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const newFooter = `  <!-- ===== FOOTER ===== -->
  <div style="display:flex; justify-content:space-between; margin-top:40px; padding: 0 40px; height:200px;">
    <!-- Left Footer: QR Code + Verification Text + Date/Time -->
    <div style="width:300px; display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div style="text-align:left;margin-bottom:8px;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=\${encodeURIComponent(d.leaveId || 'SEHA')}" style="width:100px;height:100px;">
        </div>
        <p style="font-size:10px;font-weight:bold;font-family:'Tajawal',sans-serif;text-align:center;margin:0 0 2px 0;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:9px;color:#555;text-align:center;margin:0 0 2px 0;font-style:italic;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;color:#1a73e8;text-align:center;margin:0 0 15px 0;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</p>
      </div>
      <div style="text-align:left;font-weight:bold;font-size:11px;color:#000;">
        <p style="margin:0 0 3px 0;">\${d.time || ''}</p>
        <p style="margin:0;">\${d.dayDate || ''}</p>
      </div>
    </div>

    <!-- Center Vertical Divider -->
    <div style="width:1px; background-color:#d0d0d0; height:100%;"></div>

    <!-- Right Footer: MOH Logo + Hospital Name + NHIC Logo -->
    <div style="width:300px;text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <!-- MOH Logo -->
        <div style="margin-bottom:8px;">
          <img src="\${mohLogo}" style="height:80px;">
        </div>
        <!-- Hospital Name -->
        <h3 style="font-size:14px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 3px 0;color:#333;">\${d.hospitalAr || ''}</h3>
        <h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#333;">\${d.hospitalEn || ''}</h4>
        \${d.licenseNumber ? \`<p style="font-size:10px;color:#555;margin:0 0 10px 0;">رقم الترخيص : \${d.licenseNumber}</p>\` : '<div style="height:10px;"></div>'}
      </div>
      <!-- NHIC Logo -->
      <div>
        <img src="\${nhicLogo}" style="height:55px;">
      </div>
    </div>
  </div>

</div>
</body>
</html>\`;`;

serverJs = serverJs.replace(
    /  <!-- ===== FOOTER ===== -->[\s\S]*?<\/html>`\;/,
    newFooter
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed footer layout in server.js');
