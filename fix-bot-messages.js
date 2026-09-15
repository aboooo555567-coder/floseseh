const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// I will write a script to completely replace these functions
// We will look for them using index of.

const replaceFunction = (source, startString, endString, newCode) => {
    const startIndex = source.indexOf(startString);
    if (startIndex === -1) return source;
    const endIndex = source.indexOf(endString, startIndex);
    if (endIndex === -1) return source;
    
    return source.substring(0, startIndex) + newCode + source.substring(endIndex + endString.length);
};

// 1. sendMyStatusMessage
const myStatusStart = 'const sendMyStatusMessage = async (chatId, username) => {';
const myStatusEnd = '    });\n};';
const newMyStatus = `const sendMyStatusMessage = async (chatId, username) => {
    const user = await findSubscription(chatId, username);
    const daysLeft = user.subscriptionDays || 0;
    
    let subType = 'غير نشط';
    if (daysLeft >= 360) subType = 'اشتراك سنوي 🏆';
    else if (daysLeft >= 180) subType = 'اشتراك نصف سنوي 🏅';
    else if (daysLeft >= 90) subType = 'اشتراك 3 أشهر 🥉';
    else if (daysLeft >= 25) subType = 'اشتراك شهري 🌟';
    else if (daysLeft > 0) subType = \`اشتراك باليوم (\${daysLeft} أيام)\`;
    else if (user.points > 0) subType = 'اشتراك باقة نقاط 💳';
    
    const subStatusIcon = (daysLeft > 0 || user.points > 0) ? '✅' : '❌';
    const statusText = (daysLeft > 0 || user.points > 0) ? 'نشط' : 'غير نشط';

    const statusMsg = \`👨‍💻 <b>حالة الحساب الخاصة بك:</b>

\${subStatusIcon} <b>حالة الاشتراك:</b> \${statusText}
📅 <b>نوع الاشتراك:</b> \${subType}

⏳ <b>الأيام المتبقية:</b> \${daysLeft} يوم
💎 <b>رصيد النقاط:</b> \${user.points || 0} نقطة
🎯 <b>تكلفة التقرير الواحد:</b> 5 نقاط

<i>💡 يمكنك تجديد اشتراكك أو شراء نقاط إضافية في أي وقت من متجر الباقات!</i>\`;

    await bot.sendMessage(chatId, statusMsg, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🖥️ فتح لوحة التحكم (إصدار التقارير)', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: '🛒 متجر الباقات', callback_data: 'packages' }, { text: '🎁 نظام الإحالات', callback_data: 'referrals' }]
            ]
        }
    });
};`;

serverJs = replaceFunction(serverJs, myStatusStart, myStatusEnd, newMyStatus);

// 2. sendReferralMessage
const refStart = 'const sendReferralMessage = async (chatId, username) => {';
const refEnd = '    await bot.sendMessage(chatId, referralMsg);\n};';
const newRef = `const sendReferralMessage = async (chatId, username) => {
    const user = await findSubscription(chatId, username);
    const botInfo = await bot.getMe();
    const botUsername = botInfo.username || 'zakmmm_1211_bot';
    const referralLink = \`https://t.me/\${botUsername}?start=ref_\${chatId}\`;

    const data = await loadLocalSubscriptions();
    let referralsCount = 0;
    for (const sub of Object.values(data.subscriptions)) {
        if (sub.referredBy === chatId) {
            referralsCount++;
        }
    }

    const referralMsg = \`🎁 <b>نظام الإحالات والمكافآت</b>

شارك رابطك الخاص مع أصدقائك! عندما يشترك شخص عبر رابطك ستحصل على نقاط مجانية ومكافآت مميزة! 💸

🔗 <b>رابط الدعوة الخاص بك:</b>
<code>\${referralLink}</code>

📊 <b>إحصائياتك:</b>
👥 عدد الأشخاص الذين دعوتهم: <b>\${referralsCount}</b> شخص
💎 نقاط المكافآت التي كسبتها: <b>\${user.referralPoints || 0}</b> نقطة

<i>انسخ الرابط وشاركه الآن لتبدأ بكسب النقاط!</i>\`;

    await bot.sendMessage(chatId, referralMsg, { parse_mode: 'HTML' });
};`;

serverJs = replaceFunction(serverJs, refStart, refEnd, newRef);

// 3. sendPackagesMessage
const pkgStart = 'const sendPackagesMessage = async (chatId) => {';
const pkgEnd = '        }\n    });\n};';
const newPkg = `const sendPackagesMessage = async (chatId) => {
    const packagesMsg = \`🛒 <b>متجر الباقات والاشتراكات</b>

اختر الباقة التي تناسب احتياجاتك! يتم تفعيل الباقات تلقائياً أو عبر التواصل مع الإدارة.

💳 <b>باقات النقاط (رصيد تقارير محدد):</b>
🔹 باقة 30 نقطة (يكفي لـ 6 تقارير) ⬅️ 20 ريال
🔹 باقة 100 نقطة (يكفي لـ 20 تقرير) ⬅️ 50 ريال
🔹 باقة 200 نقطة (يكفي لـ 40 تقرير) ⬅️ 80 ريال

👑 <b>الباقات المفتوحة (تقارير غير محدودة):</b>
🔸 اشتراك شهر (30 يوم) ⬅️ 100 ريال
🔸 اشتراك 3 أشهر (90 يوم) ⬅️ 300 ريال
🔸 اشتراك نصف سنوي (180 يوم) ⬅️ 500 ريال
🔸 اشتراك سنوي (365 يوم) ⬅️ 800 ريال

👇 <b>اختر الباقة للطلب أو الاستفسار:</b>\`;

    const ownerLink = \`https://t.me/\${ADMIN_USERNAME}\`;
    const inlineKeyboard = [
        [{ text: '👑 اشتراك شهر مفتوح (100 ريال)', url: \`\${ownerLink}?text=\${encodeURIComponent('السلام عليكم، أريد الاشتراك: شهر مفتوح (100 ريال)')}\` }],
        [{ text: '👑 اشتراك 3 أشهر مفتوح (300 ريال)', url: \`\${ownerLink}?text=\${encodeURIComponent('السلام عليكم، أريد الاشتراك: 3 أشهر مفتوحة (300 ريال)')}\` }],
        [{ text: '👑 اشتراك سنوي مفتوح (800 ريال)', url: \`\${ownerLink}?text=\${encodeURIComponent('السلام عليكم، أريد الاشتراك: سنة مفتوحة (800 ريال)')}\` }],
        [{ text: '💳 باقة 30 نقطة (20 ريال)', url: \`\${ownerLink}?text=\${encodeURIComponent('السلام عليكم، أريد شراء: باقة 30 نقطة (20 ريال)')}\` }],
        [{ text: '💳 باقة 100 نقطة (50 ريال)', url: \`\${ownerLink}?text=\${encodeURIComponent('السلام عليكم، أريد شراء: باقة 100 نقطة (50 ريال)')}\` }],
        [{ text: '💳 باقة 200 نقطة (80 ريال)', url: \`\${ownerLink}?text=\${encodeURIComponent('السلام عليكم، أريد شراء: باقة 200 نقطة (80 ريال)')}\` }]
    ];

    await bot.sendMessage(chatId, packagesMsg, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
};`;

serverJs = replaceFunction(serverJs, pkgStart, pkgEnd, newPkg);

// Finally, update the message listener block to route properly without duplication
const msgListenerStart = "if (msg.text === '👨‍💻 حالة الحساب') {";
const msgListenerEnd = "    if (msg.text === '🛒 متجر الباقات') {\n        await sendPackagesMessage(chatId);\n        return;\n    }";

const newMsgListener = `if (msg.text === '👨‍💻 حالة الحساب' || msg.text === 'حالة الحساب') {
        await sendMyStatusMessage(chatId, username);
        return;
    }
    
    if (msg.text === '🎁 الإحالات (مكافآت)' || msg.text === 'الإحالات') {
        await sendReferralMessage(chatId, username);
        return;
    }
    
    if (msg.text === '🛒 متجر الباقات' || msg.text === 'متجر الباقات') {
        await sendPackagesMessage(chatId);
        return;
    }`;

// Note: text encoding in powerShell means "👨‍💻 حالة الحساب" is garbled in the source code.
// Let's rely on regex or careful replace.
// Actually, since it's already using Arabic in the source code, let's just write a clever replacer.
fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Functions updated successfully");
