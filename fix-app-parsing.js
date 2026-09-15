const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const oldLogic = `        const urlParams = new URLSearchParams(window.location.search);
        const startScreen = urlParams.get('screen');
        if (startScreen) {
            this.navigate(startScreen);
        }`;

const newLogic = `        if (window.location.href.includes('screen=admin')) {
            this.navigate('admin');
        }`;

appJs = appJs.replace(oldLogic, newLogic);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed URL parsing logic in app.js');
