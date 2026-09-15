const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const searchStr = `        const dateObj = new Date();
        const yy = dateObj.getFullYear().toString().slice(2);
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const dd = dateObj.getDate().toString().padStart(2, '0');
        const rand5 = Math.floor(10000 + Math.random() * 90000); // 5 digits
        const generatedId = \`\${leaveTypeValue}\${yy}\${mm}\${dd}\${rand5}\`;`;

const replaceStr = `        const dateObj = new Date(issueDate || Date.now());
        const yy = dateObj.getFullYear().toString().slice(2);
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const dd = dateObj.getDate().toString().padStart(2, '0');
        const rand5 = Math.floor(Math.random() * 100000).toString().padStart(5, '0'); // exact 5 digits with leading zeros allowed
        const generatedId = \`\${leaveTypeValue}\${yy}\${mm}\${dd}\${rand5}\`;`;

if(appJs.includes(searchStr)) {
    appJs = appJs.replace(searchStr, replaceStr);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated ID generation format!");
} else {
    console.log("String not found!");
}
