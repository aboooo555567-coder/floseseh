const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const oldAdminCode = `    const inlineKeyboard = [[
        { text: '🚀 فتح', web_app: { url: adminUrl } }
    ]];`;

const newAdminCode = `    const inquiryUrl = \`\${process.env.APP_URL || 'https://seha-sickleave.onrender.com'}/inquiry\`;
    const inlineKeyboard = [
        [{ text: '🚀 فتح لوحة التحكم', web_app: { url: adminUrl } }],
        [{ text: '🔍 فتح الاستعلام الداخلي', web_app: { url: inquiryUrl } }]
    ];`;

if (serverJs.includes(oldAdminCode)) {
    serverJs = serverJs.replace(oldAdminCode, newAdminCode);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Added inquiry button to /admin command.");
} else {
    console.log("Could not find oldAdminCode in server.js");
}
