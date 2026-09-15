const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

const oldRadioCss = '.custom-radio-group { display: flex; justify-content: flex-end; gap: 20px; margin-top: 8px; direction: rtl; }';
const newRadioCss = '.custom-radio-group { display: flex; justify-content: flex-start; gap: 20px; margin-top: 8px; direction: rtl; }';

if (indexHtml.includes(oldRadioCss)) {
    indexHtml = indexHtml.replace(oldRadioCss, newRadioCss);
    
    // bump cache
    indexHtml = indexHtml.replace(/app\.js\?v=\d+/, 'app.js?v=' + Math.floor(Math.random() * 10000));
    
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log("Updated radio group alignment.");
} else {
    console.log("Could not find the specific CSS string.");
}
