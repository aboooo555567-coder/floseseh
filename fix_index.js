const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const startIdx = content.indexOf('<!-- Hidden PDF Template -->');
if (startIdx !== -1) {
    const newContent = content.substring(0, startIdx) + '</body>\n</html>';
    fs.writeFileSync('index.html', newContent, 'utf8');
    console.log("Fixed index.html properly with UTF-8");
} else {
    console.log("Template not found in index.html");
}
