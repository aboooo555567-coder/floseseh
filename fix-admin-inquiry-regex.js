const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /const inlineKeyboard = \[\[\s*\{\s*text: '[^']+',\s*web_app:\s*\{\s*url:\s*adminUrl\s*\}\s*\}\s*\]\];/;

const newAdminCode = `    const inquiryUrl = \`\${process.env.APP_URL || 'https://seha-sickleave.onrender.com'}/inquiry\`;
    const inlineKeyboard = [
        [{ text: '🚀 فتح لوحة التحكم', web_app: { url: adminUrl } }],
        [{ text: '🔍 فتح الاستعلام الداخلي', web_app: { url: inquiryUrl } }]
    ];`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, newAdminCode);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Regex replaced admin keyboard successfully.");
} else {
    console.log("Regex failed.");
}
