const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Fix 1: Change companion dropdown to show GSL/PSL instead of "Companion"
const oldDropdown = `typeSelect.innerHTML = type === 'companion' ? '<option value="Companion">Companion</option>' : '<option value="GSL">GSL</option><option value="PSL">PSL</option>';`;
const newDropdown = `typeSelect.innerHTML = '<option value="GSL">GSL</option><option value="PSL">PSL</option>';`;

if (appJs.includes(oldDropdown)) {
    appJs = appJs.replace(oldDropdown, newDropdown);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Fixed: companion now shows GSL/PSL dropdown.");
} else {
    console.log("Old dropdown string not found!");
}
