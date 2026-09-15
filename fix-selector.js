const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const oldCode = `const datesRow = document.querySelector('.dates-row');`;
const newCode = `const datesRow = document.querySelector('#escort-fields .dates-row');`;

if (appJs.includes(oldCode)) {
    appJs = appJs.replace(oldCode, newCode);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Fixed DOMException in app.js");
} else {
    console.log("String not found in app.js!");
}
