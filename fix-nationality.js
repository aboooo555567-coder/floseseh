const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Find the nationality input and replace it
indexHtml = indexHtml.replace(
    /<input type="text" id="nationality"[^>]+>/,
    '<input type="text" id="nationality" onclick="app.openDropdown(\'nationality\')" placeholder="الجنسية" value="سعودي" autocomplete="off" required>'
);

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Fixed nationality input');
