const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace standard web_app button texts
serverJs = serverJs.replace(/'🖥️ فتح لوحة التحكم \(إصدار التقارير\)'/g, "'🚀 Open'");
serverJs = serverJs.replace(/'💻 فتح لوحة التحكم \(إصدار التقارير\)'/g, "'🚀 Open'");
serverJs = serverJs.replace(/'🖥️ فتح لوحة التحكم 🚀 \(إصدار التقارير\)'/g, "'🚀 Open'");
serverJs = serverJs.replace(/'فتح لوحة التحكم 🚀'/g, "'🚀 Open'");
serverJs = serverJs.replace(/'🖥️ فتح لوحة التحكم'/g, "'🚀 Open'");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated WebApp button text to Open.");
