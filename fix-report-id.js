const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Find the line generating reportId
const searchString = 'const reportId = this.state.currentReportId || `GSL${Math.floor(Math.random() * 10000000000)}`;';
// Replace it to use the leave_type value
const replaceString = `const leaveTypeValue = document.getElementById('leave_type').value || 'GSL';\n        const reportId = this.state.currentReportId || \`\${leaveTypeValue}\${Math.floor(Math.random() * 10000000000)}\`;`;

if (appJs.includes(searchString)) {
    appJs = appJs.replace(searchString, replaceString);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated reportId generation to use PSL/GSL prefix.");
} else {
    console.log("Could not find the search string in app.js.");
}
