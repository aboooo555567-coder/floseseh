const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const searchRegex = /const generatedId = `\$\{leaveTypeValue\}\$\{yy\}\$\{mm\}\$\{dd\}\$\{rand5\}`;[\s\r\n]*const reportId = this\.state\.currentReportId \|\| generatedId;/;

const replace = `const generatedId = \`\${leaveTypeValue}\${yy}\${mm}\${dd}\${rand5}\`;
        const manualLeaveId = document.getElementById('manual_leave_id') ? document.getElementById('manual_leave_id').value.trim() : '';
        const reportId = manualLeaveId || this.state.currentReportId || generatedId;`;

if (searchRegex.test(appJs)) {
    appJs = appJs.replace(searchRegex, replace);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated reportId generation in app.js");
} else {
    console.log("Regex not found in app.js!");
}
