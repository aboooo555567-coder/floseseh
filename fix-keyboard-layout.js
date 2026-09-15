const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Update Custom Keyboard in handleStartCommand to match the image
const oldKeyboard = `            keyboard: [
                [{ text: '🚀 فتح', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: '🎁 الإحالات (مكافآت)' }, { text: '🛒 متجر الباقات' }],
                [{ text: '👨‍💻 حالة الحساب' }],
                [{ text: '❓ مساعدة' }]
            ],`;

const newKeyboard = `            keyboard: [
                [{ text: '🛒 متجر الباقات' }, { text: '🔗 كسب نقاط (الإحالات)' }],
                [{ text: '📊 حالة حسابي' }]
            ],`;

// We also need to find whatever the old keyboard was since the arabic is messed up in regex
// Let's replace using index bounds.
let kbStart = serverJs.indexOf("keyboard: [");
let kbEnd = serverJs.indexOf("],", kbStart);
if (kbStart !== -1 && kbEnd !== -1) {
    serverJs = serverJs.substring(0, kbStart) + newKeyboard.substring(12) + serverJs.substring(kbEnd + 2);
}

// 2. Remove inline keyboard from sendMyStatusMessage
const statusMsgSendTarget = `    await bot.sendMessage(chatId, statusMsg, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 فتح', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: '🛒 متجر الباقات', callback_data: 'packages' }, { text: '🎁 نظام الإحالات', callback_data: 'referrals' }]
            ]
        }
    });`;

let msgSendStart = serverJs.indexOf("await bot.sendMessage(chatId, statusMsg, {");
if (msgSendStart !== -1) {
    let msgSendEnd = serverJs.indexOf("});", msgSendStart);
    if (msgSendEnd !== -1) {
        serverJs = serverJs.substring(0, msgSendStart) + "await bot.sendMessage(chatId, statusMsg);" + serverJs.substring(msgSendEnd + 3);
    }
}

// 3. Update the string matchers for the new button texts
serverJs = serverJs.replace(/'👨‍💻 حالة الحساب'/g, "'📊 حالة حسابي'");
serverJs = serverJs.replace(/'🎁 الإحالات \(مكافآت\)'/g, "'🔗 كسب نقاط (الإحالات)'");
serverJs = serverJs.replace(/'🛒 متجر الباقات'/g, "'🛒 متجر الباقات'"); // Just in case

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated keyboard layout and message routes to match image exactly.");
