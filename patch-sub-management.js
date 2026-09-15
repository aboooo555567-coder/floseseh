const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const newCommands = `
// Admin command to cancel subscription
bot.onText(/\\/cancelsub\\s+@?(\\w+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) return;

    const targetUsername = match[1].toLowerCase();
    try {
        const data = await loadLocalSubscriptions();
        let foundChatId = null;
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === targetUsername) {
                foundChatId = cid;
                break;
            }
        }
        
        if (!foundChatId) {
            await bot.sendMessage(chatId, '❌ المستخدم غير موجود في قاعدة البيانات.');
            return;
        }
        
        const user = data.subscriptions[foundChatId];
        user.subscriptionDays = 0;
        user.subscriptionExpires = null;
        user.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        
        await bot.sendMessage(chatId, \`✅ تم إلغاء الاشتراك اللامحدود للمستخدم @\${targetUsername} بنجاح.\`);
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, \`⚠️ تم إلغاء اشتراكك اللامحدود من قبل الإدارة. يرجى تجديد الاشتراك للتمكن من استخراج التقارير.\`);
            } catch(e){}
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});

// Admin command to remove points
bot.onText(/\\/removepoints\\s+@?(\\w+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) return;

    const targetUsername = match[1].toLowerCase();
    try {
        const data = await loadLocalSubscriptions();
        let foundChatId = null;
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === targetUsername) {
                foundChatId = cid;
                break;
            }
        }
        
        if (!foundChatId) {
            await bot.sendMessage(chatId, '❌ المستخدم غير موجود في قاعدة البيانات.');
            return;
        }
        
        const user = data.subscriptions[foundChatId];
        user.points = 0;
        user.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        
        await bot.sendMessage(chatId, \`✅ تم تصفير نقاط المستخدم @\${targetUsername} بنجاح.\`);
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, \`⚠️ تم سحب نقاطك من قبل الإدارة. يرجى الشحن للتمكن من استخراج التقارير.\`);
            } catch(e){}
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});

// Admin command to list subscribers
bot.onText(/\\/subscribers/i, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) return;

    try {
        const data = await loadLocalSubscriptions();
        let message = '📋 **قائمة المشتركين الفعالين:**\\n\\n';
        let count = 0;
        
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            const norm = normalizeSubscription(sub);
            if (norm.subscriptionDays > 0 || (norm.points && norm.points > 0)) {
                count++;
                message += \`👤 @\${norm.username || 'مجهول'} (\${cid})\\n\`;
                if (norm.subscriptionDays > 0) message += \` └ 🗓 اشتراك: \${norm.subscriptionDays} يوم\\n\`;
                if (norm.points > 0) message += \` └ 🪙 نقاط: \${norm.points} نقطة\\n\`;
                message += '\\n';
            }
        }
        
        if (count === 0) {
            message += 'لا يوجد مشتركين فعالين حالياً.';
        } else {
            message += \`إجمالي الفعالين: \${count}\`;
        }
        
        // If message is too long, split it or just send it (Telegram limit is 4096)
        if (message.length > 4000) {
            message = message.substring(0, 4000) + '... (مقطوع)';
        }
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});
`;

// Insert the new commands
const addPointsRegex = /(bot\.onText\(\/\\\/addpoints.*?}\n    }\n}\);\n)/s;
serverJs = serverJs.replace(addPointsRegex, `$1\n${newCommands}\n`);


// Enhance blocking logic in /api/generate-native-pdf
const generateRegex = /(app\.post\('\/api\/generate-native-pdf', async \(req, res\) => {\n    let browser = null;\n    try {\n        const { chatId, reportData, filename, reportId } = req\.body;\n        addLog\(`generate-native-pdf called for chatId: \$\{chatId\}`\);\n        \n        if \(!chatId \|\| !reportData\) {\n            return res\.status\(400\)\.json\({ success: false, error: 'Missing chatId or reportData' }\);\n        })/s;

const generateReplacement = `$1
        
        // --- STRICT BLOCKING LOGIC ---
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        if (!data.subscriptions[chatIdStr]) {
            return res.status(403).json({ success: false, error: '❌ حسابك غير موجود. يرجى تفعيل الاشتراك من البوت.' });
        }
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        // Determine if it's an update
        let isUpdate = false;
        if (userSub.reports && reportId) {
            isUpdate = userSub.reports.some(r => r.id === reportId || r.id === reportData.id);
        }
        
        if (!isUpdate) {
            if (normalized.subscriptionDays <= 0 && (normalized.points || 0) < 5) {
                return res.status(403).json({ success: false, error: '❌ عذراً، لا يوجد لديك اشتراك فعال ولا رصيد نقاط كافٍ. يرجى تجديد الاشتراك لإصدار التقرير.' });
            }
        }
        // -----------------------------
`;
serverJs = serverJs.replace(generateRegex, generateReplacement);


fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Successfully updated server.js with cancel sub, remove points, subscribers list, and strict blocking logic!");
