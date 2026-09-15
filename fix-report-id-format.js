const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const searchString = "const reportId = this.state.currentReportId || `${leaveTypeValue}${Math.floor(Math.random() * 10000000000)}`;";

const replaceString = `const dateObj = new Date();
        const yy = dateObj.getFullYear().toString().slice(2);
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const dd = dateObj.getDate().toString().padStart(2, '0');
        const rand5 = Math.floor(10000 + Math.random() * 90000); // 5 digits
        const generatedId = \`\${leaveTypeValue}\${yy}\${mm}\${dd}\${rand5}\`;
        const reportId = this.state.currentReportId || generatedId;`;

if (appJs.includes(searchString)) {
    appJs = appJs.replace(searchString, replaceString);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated reportId generation pattern.");
} else {
    console.log("Could not find the search string in app.js.");
}
