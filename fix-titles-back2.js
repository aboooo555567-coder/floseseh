const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<!-- Header: KSA Calligraphy \(center\) -->[\s\S]*?<!-- Data Table -->[\s\S]*?<div style="position:absolute;top:185px;left:40px;width:714px;">/g;

const newBlock = `<!-- Header: KSA Calligraphy (center) -->
  <img src="\${ksaCalligraphy}" style="position:absolute;top:35px;left:50%;transform:translateX(-50%);width:180px;height:70px;object-fit:contain;">
  
  <!-- Header: Kingdom text -->
  <div style="position:absolute;top:105px;left:0;width:794px;text-align:center;">
    <p style="font-family:'Times New Roman',serif;font-size:18px;color:#000;font-weight:bold;">Kingdom of Saudi Arabia</p>
  </div>
  
  <!-- Header: Arabic Title -->
  <div style="position:absolute;top:145px;left:0;width:794px;text-align:center;">
    <h1 style="color:#216ba5;font-size:26px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0;">\${d.titleAr || 'تقرير إجازة مرضية'}</h1>
  </div>
  
  <!-- Header: English Title -->
  <div style="position:absolute;top:180px;left:0;width:794px;text-align:center;">
    <h2 style="color:#216ba5;font-size:18px;font-weight:bold;margin:0;">\${d.titleEn || 'Sick Leave Report'}</h2>
  </div>
  
  <!-- Header: Geometric graphic (right) -->
  <svg width="120" height="65" viewBox="0 0 150 80" style="position:absolute;top:35px;left:634px;opacity:0.6;">
    <path d="M 0,10 L 40,40 L 90,10 L 130,30 L 150,0 M 40,40 L 60,70 L 90,10 M 60,70 L 130,30 M 90,10 L 110,80 L 130,30 M 110,80 L 150,60" stroke="#b0c4de" stroke-width="1.2" fill="none"/>
  </svg>

  <!-- Horizontal separator line -->
  <div style="display:none; position:absolute;top:170px;left:40px;width:714px;height:1px;background:#dee2e6;"></div>

  <!-- Data Table -->
  <div style="position:absolute;top:220px;left:40px;width:714px;">`;

serverJs = serverJs.replace(regex, newBlock);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Restored and enlarged titles, shifted table down (Attempt 2)');
