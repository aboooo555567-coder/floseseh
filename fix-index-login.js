const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

const oldH2 = `<h2 style="color: var(--primary-dark); margin-bottom: 10px;">سجل التقارير</h2>`;
const newH2 = `<h2 style="color: var(--primary-dark); margin-bottom: 10px;" onclick="app.promptAdminLogin()">سجل التقارير</h2>`;

indexHtml = indexHtml.replace(oldH2, newH2);
indexHtml = indexHtml.replace(/app\.js\?v=\d+/g, 'app.js?v=' + Math.floor(Math.random() * 10000));

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Modified index.html to add admin login prompt');
