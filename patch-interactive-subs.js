const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Add /addpoints command logic
const addPointsLogic = `
// Admin command to add points
bot.onText(/\\/addpoints\\s+@?(\\w+)\\s+(\\d+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) {
        await bot.sendMessage(chatId, 'ليس لديك صلاحية المسؤول لتنفيذ هذا الأمر.');
        return;
    }

    const targetUsername = match[1];
    const pointsToAdd = parseInt(match[2], 10);
    if (!targetUsername || isNaN(pointsToAdd) || pointsToAdd <= 0) {
        await bot.sendMessage(chatId, 'يرجى استخدام الصيغة الصحيحة: /addpoints @username 50');
        return;
    }

    try {
        const data = await loadLocalSubscriptions();
        const cleaned = targetUsername.toLowerCase();
        
        let foundChatId = null;
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === cleaned) {
                foundChatId = cid;
                break;
            }
        }
        
        if (!foundChatId) {
            foundChatId = 'pending_' + cleaned;
            data.subscriptions[foundChatId] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: cleaned,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const user = data.subscriptions[foundChatId];
        user.points = (user.points || 0) + pointsToAdd;
        user.updatedAt = new Date().toISOString();
        
        await saveLocalSubscriptions(data);
        
        await bot.sendMessage(chatId, \`✅ تم إضافة \${pointsToAdd} نقطة بنجاح للمستخدم @\${targetUsername}. الرصيد الجديد: \${user.points} نقطة.\`);
        
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, \`🎉 تم شحن رصيدك بـ \${pointsToAdd} نقطة من قبل الإدارة! 
رصيدك الحالي أصبح \${user.points} نقطة.
يمكنك استخراج التقارير الآن.\`);
            } catch (e) {
                console.warn('Could not notify user of added points:', e.message);
            }
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ حدث خطأ أثناء إضافة النقاط: ' + err.message);
    }
});
`;

// Insert the /addpoints command after the /addsub command
const addSubRegex = /(bot\.onText\(\/\\\/addsub.*?}\n    }\n}\);\n)/s;
serverJs = serverJs.replace(addSubRegex, `$1\n${addPointsLogic}\n`);


// 2. Update /api/admin/add-user to send interactive message
const addUserRegex = /(app\.post\('\/api\/admin\/add-user'.*?)(await saveLocalSubscriptions\(data\);)(.*?res\.json\({ success: true, message: 'تم التفعيل بنجاح!' }\);)/s;
const addUserReplacement = `$1$2
        
        if (!foundChatId.startsWith('pending_')) {
            try {
                let notifyMsg = '🎉 تم تحديث اشتراكك من قبل الإدارة!\\n';
                if (addedDays > 0) notifyMsg += \`✅ تم تفعيل اشتراك لامحدود لمدة \${addedDays} يوم.\\n\`;
                if (parseInt(points) > 0) notifyMsg += \`✅ تم إضافة \${points} نقطة لرصيدك.\\n\`;
                notifyMsg += 'يمكنك الآن الاستمتاع بخدمات البوت.';
                
                // Use a non-blocking message send
                bot.sendMessage(foundChatId, notifyMsg).catch(e => console.warn('Could not send to user from API:', e.message));
            } catch(e) {}
        }
$3`;
serverJs = serverJs.replace(addUserRegex, addUserReplacement);


// 3. Make the /addsub command interactiveness slightly better
const oldAddSubMsg = /await bot\.sendMessage\(result\.chatId, \`🎉 تم تفعيل اشتراكك لمدة \$\{days\} يوم من قبل المسؤول! يمكنك الآن فتح التطبيق عبر \/start\.\`\);/g;
const newAddSubMsg = `await bot.sendMessage(result.chatId, \`🎉 تم تفعيل اشتراكك لامحدود لمدة \${days} يوم من قبل الإدارة!\\nيمكنك الآن استخراج تقارير بلا حدود طوال فترة الاشتراك.\\nافتح التطبيق عبر قائمة البوت.\`);`;
serverJs = serverJs.replace(oldAddSubMsg, newAddSubMsg);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Successfully updated server.js with interactive features!");
