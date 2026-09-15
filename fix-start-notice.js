const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Update findSubscription
const findSubTarget = `        // If we matched a pending Username subscription, migrate it to the active Chat ID
        if (foundChatId !== chatIdStr) {
            delete data.subscriptions[foundChatId];
            data.subscriptions[chatIdStr] = userSub;
        }`;
        
const findSubReplacement = `        // If we matched a pending Username subscription, migrate it to the active Chat ID
        if (foundChatId !== chatIdStr) {
            if (foundChatId.startsWith('pending_')) {
                userSub.isNewlyMigrated = true;
            }
            delete data.subscriptions[foundChatId];
            data.subscriptions[chatIdStr] = userSub;
        }`;

serverJs = serverJs.replace(findSubTarget, findSubReplacement);

// 2. Update handleStartCommand
const welcomeTextTarget = "    const welcomeText = `";
const welcomeTextReplacement = `    let adminNotice = '';
    if (user.isNewlyMigrated) {
        adminNotice = '🎉 <b>تم تفعيل اشتراكك يدوياً من قبل الإدارة!</b> 🥳\\n\\n';
        // Clean up flag so it doesn't stay in memory forever
        delete user.isNewlyMigrated;
        // Optionally save to remove the flag from disk if it got saved
        const data = await loadLocalSubscriptions();
        if (data.subscriptions[chatId]) {
            delete data.subscriptions[chatId].isNewlyMigrated;
            await saveLocalSubscriptions(data);
        }
    }
    
    const welcomeText = \`\${adminNotice}`;

serverJs = serverJs.replace(welcomeTextTarget, welcomeTextReplacement);

// 3. Make parse_mode HTML for the start message so the <b> tags work
const sendMsgTarget = "    await bot.sendMessage(chatId, welcomeText, {";
const sendMsgReplacement = "    await bot.sendMessage(chatId, welcomeText, {\n        parse_mode: 'HTML',";

serverJs = serverJs.replace(sendMsgTarget, sendMsgReplacement);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated Start logic for manual activation notices.");
