const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /await bot\.sendMessage\(chatId,\s*referralMsg\);/;
const replacement = `await bot.sendMessage(chatId, referralMsg, {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }
            ]]
        }
    });`;

if (serverJs.match(regex)) {
    serverJs = serverJs.replace(regex, replacement);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Added inline Open button to referral message.");
} else {
    console.log("Could not find referral message send call.");
}
