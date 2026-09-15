const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

const oldInput = '<input type="text" id="national_id" placeholder="1xxxxxxxxx أو 2xxxxxxxxx" required>';
const newInput = '<input type="text" id="national_id" placeholder="1xxxxxxxxx" style="text-align: left; direction: ltr;" required>';

if (indexHtml.includes(oldInput)) {
    indexHtml = indexHtml.replace(oldInput, newInput);
    // bump cache
    indexHtml = indexHtml.replace(/app\.js\?v=\d+/, 'app.js?v=' + Math.floor(Math.random() * 10000));
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log("Updated National ID placeholder and alignment in index.html");
} else {
    console.log("Could not find oldInput in index.html");
}
