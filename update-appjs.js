const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Find the line that sets the options
const searchString = `typeSelect.innerHTML = type === 'companion' ? '<option value="Companion">Companion</option>' : '<option value="GSL">GSL</option>';`;
const replaceString = `typeSelect.innerHTML = type === 'companion' ? '<option value="Companion">Companion</option>' : '<option value="GSL">GSL</option><option value="PSL">PSL</option>';`;

if (appJs.includes(searchString)) {
    appJs = appJs.replace(searchString, replaceString);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated app.js to include PSL option.");
} else {
    console.log("Could not find the search string in app.js.");
}
