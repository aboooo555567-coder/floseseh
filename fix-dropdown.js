const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

indexHtml = indexHtml.replace(/app\.showDropdown/g, 'app.openDropdown');

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Fixed showDropdown to openDropdown');
