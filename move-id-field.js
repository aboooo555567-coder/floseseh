const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');

// Find the div wrapping national_id
// We'll just replace the literal string
const htmlOld = `<div class="form-group">
                        <label>رقم الهوية / الإقامة</label>
                        <input type="text" id="national_id"`;
                        
const htmlNew = `<div class="form-group" id="national-id-group">
                        <label>رقم الهوية / الإقامة</label>
                        <input type="text" id="national_id"`;

// Since it might have encoding issues, let's use regex based on id="national_id"
html = html.replace(/<div class="form-group">\s*<label>[^<]+<\/label>\s*<input type="text" id="national_id"/g, 
function(match) {
    return match.replace('<div class="form-group">', '<div class="form-group" id="national-id-group">');
});
fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated index.html to add ID to national-id-group");


// 2. Update app.js
let appJs = fs.readFileSync('app.js', 'utf8');

const jsOld = `document.getElementById('escort-fields').style.display = type === 'companion' ? 'block' : 'none';`;
const jsNew = `document.getElementById('escort-fields').style.display = type === 'companion' ? 'block' : 'none';
        
        // Dynamically move National ID field based on type
        const idGroup = document.getElementById('national-id-group');
        if (idGroup) {
            if (type === 'companion') {
                const datesRow = document.querySelector('.dates-row');
                document.getElementById('escort-fields').insertBefore(idGroup, datesRow);
            } else {
                const step2 = document.getElementById('step-2');
                step2.insertBefore(idGroup, step2.firstChild);
            }
        }`;

appJs = appJs.replace(jsOld, jsNew);
fs.writeFileSync('app.js', appJs, 'utf8');
console.log("Updated app.js to move national_id field dynamically");
