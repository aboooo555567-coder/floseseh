const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

indexHtml = indexHtml.replace('<input type="number" id="admin_chat_id"', '<input type="text" id="admin_chat_id" placeholder="معرف تيلجرام (مثال: @zakaria) أو الأيدي"');

// Cache bust app.js
indexHtml = indexHtml.replace(/app\.js\?v=\d+/g, 'app.js?v=' + Math.floor(Math.random() * 10000));

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Modified index.html input type');
