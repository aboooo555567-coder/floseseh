const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const search = `        let hours = now.getHours().toString().padStart(2, '0');
        let minutes = now.getMinutes().toString().padStart(2, '0');
        document.getElementById('issue_time').value = \`\${hours}:\${minutes}\`;`;

const replace = `        // Generate random time instead of current time
        let randHours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        let randMinutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        document.getElementById('issue_time').value = \`\${randHours}:\${randMinutes}\`;`;

if (appJs.includes(search)) {
    appJs = appJs.replace(search, replace);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated issue_time to be random.");
} else {
    console.log("String not found!");
}
