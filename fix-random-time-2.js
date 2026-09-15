const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// We use regex to handle any potential spacing/newline issues (like \r\n vs \n)
const searchRegex = /let hours = now\.getHours\(\)\.toString\(\)\.padStart\(2, '0'\);\s*let minutes = now\.getMinutes\(\)\.toString\(\)\.padStart\(2, '0'\);\s*document\.getElementById\('issue_time'\)\.value = `\$\{hours\}:\$\{minutes\}`;/g;

const replace = `let randHours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        let randMinutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        document.getElementById('issue_time').value = \`\${randHours}:\${randMinutes}\`;`;

if (searchRegex.test(appJs)) {
    appJs = appJs.replace(searchRegex, replace);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated issue_time to be random (Regex).");
} else {
    console.log("Still not found!");
}
