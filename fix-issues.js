const fs = require('fs');

// 1. Fix server.js
let serverJs = fs.readFileSync('server.js', 'utf8');

// Fix /admin authorization
serverJs = serverJs.replace(
    /if \(!username \|\| username\.toLowerCase\(\) !== ADMIN_USERNAME\.toLowerCase\(\)\) {/g,
    `const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) {`
);

// Fix Puppeteer timeout (networkidle2 -> load)
serverJs = serverJs.replace(/waitUntil: 'networkidle2'/g, "waitUntil: 'load'");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed server.js (Admin Auth & Puppeteer Timeout)');

// 2. Fix index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Restore hospital input
indexHtml = indexHtml.replace(
    /<input type="text" id="hospital_ar" list="hospital_list" placeholder="[^"]+" oninput="app\.syncHospitalEn\(\)" required>/,
    '<input type="text" id="hospital_ar" onclick="app.showDropdown(\'hospital\')" placeholder="اختر من القائمة أو اكتب يدوياً..." oninput="app.syncHospitalEn()" autocomplete="off" required>'
);
indexHtml = indexHtml.replace(/<datalist id="hospital_list"><\/datalist>/g, '');

// Restore nationality input
indexHtml = indexHtml.replace(
    /<input type="text" id="nationality" list="nationality_list" placeholder="الجنسية" value="سعودي" required>/,
    '<input type="text" id="nationality" onclick="app.showDropdown(\'nationality\')" placeholder="الجنسية" value="سعودي" oninput="app.syncHospitalEn()" autocomplete="off" required>'
);
indexHtml = indexHtml.replace(/<datalist id="nationality_list"><\/datalist>/g, '');

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Fixed index.html (Restored custom dropdowns)');
