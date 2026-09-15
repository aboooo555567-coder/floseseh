const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Remove from old location
const oldLogic = `        if (window.location.href.includes('screen=admin')) {
            this.navigate('admin');
        }`;
appJs = appJs.replace(oldLogic, '');

// Add to very top of init
const newLogic = `
    async init() {
        if (window.location.href.includes('screen=admin')) {
            this.navigate('admin');
            // Hide fab just in case
            document.getElementById('fab-menu').style.display = 'none';
        }
`;
appJs = appJs.replace('async init() {', newLogic);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Moved URL parsing to top of init');
