const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// I will match the exact block for sendDocument.
// There are two identical blocks:
/*
        const message = await bot.sendDocument(chatId, pdfBuffer, {
            caption: '✅ تم إصدار التقرير بنجاح 📎'
        }, {
*/
// Let's replace the caption string match by injecting the reply_markup.

const regex = /bot\.sendDocument\(\s*chatId,\s*pdfBuffer,\s*\{\s*caption:\s*'[^']+'\s*\}\s*,/g;

// To replace, we can provide a function
serverJs = serverJs.replace(regex, (match) => {
    // We want to replace the `}` before the `,` with `, reply_markup: { inline_keyboard: [[ { text: '🚀 فتح لوحة التحكم', web_app: { url: WEB_APP_URL_CACHED } } ]] } }`
    return match.replace(/}\s*,/, `,
            reply_markup: {
                inline_keyboard: [[
                    { text: '🚀 فتح', web_app: { url: WEB_APP_URL_CACHED } }
                ]]
            }
        },`);
});

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated sendDocument calls with WebApp button!");
