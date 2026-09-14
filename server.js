const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs').promises;

const crypto = require('crypto');
let currentAdminToken = null;


// Configuration
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '***REDACTED-BOT-TOKEN***';
const PORT = process.env.PORT || 3000;
const WEB_APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.WEB_APP_URL || 'https://seha-sickleave.onrender.com';
const WEB_APP_URL_CACHED = WEB_APP_URL + '?v=47';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Zakaria_2025';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '1211116248';
const OWNER_CONTACT = `https://t.me/${ADMIN_USERNAME}`;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1002184109677';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Local database path
const subscriptionsPath = path.join(__dirname, 'subscriptions.json');

// Helper to compute remaining subscription days
const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return 0;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

// Normalize subscriber object
const normalizeSubscription = (user) => {
    if (!user) return null;
    const now = new Date();
    
    // Migration helper: if they have subscriptionDays > 0 but no expires date
    if (user.subscriptionDays > 0 && !user.subscriptionExpires) {
        const expires = new Date(now.getTime() + user.subscriptionDays * 24 * 60 * 60 * 1000);
        user.subscriptionExpires = expires.toISOString();
    }
    
    user.subscriptionDays = getDaysRemaining(user.subscriptionExpires);
    return user;
};

// Read local subscriptions.json
const loadLocalSubscriptions = async () => {
    try {
        const data = await fs.readFile(subscriptionsPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return { subscriptions: {} };
    }
};

// Write local subscriptions.json
const saveLocalSubscriptions = async (data) => {
    try {
        await fs.writeFile(subscriptionsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error writing local subscriptions.json:', e.message);
    }
};

// Find user subscription by Chat ID or Telegram Username
const findSubscription = async (chatId, username, referrerId = null) => {
    const data = await loadLocalSubscriptions();
    const chatIdStr = chatId.toString();
    const cleanedUsername = username ? username.replace(/^@/, '').toLowerCase() : null;
    
    let userSub = null;
    let foundChatId = chatIdStr;
    
    // 1. Search by Username
    if (cleanedUsername) {
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === cleanedUsername) {
                userSub = sub;
                foundChatId = cid;
                break;
            }
        }
    }
    
    // 2. Search by Chat ID
    if (!userSub && data.subscriptions[chatIdStr]) {
        userSub = data.subscriptions[chatIdStr];
    }
    
    // 3. Normalize subscription or create new
    if (userSub) {
        userSub = normalizeSubscription(userSub);
        if (cleanedUsername && userSub.username !== cleanedUsername) {
            userSub.username = cleanedUsername;
        }
        
        // If we matched a pending Username subscription, migrate it to the active Chat ID
        if (foundChatId !== chatIdStr) {
            const existingActive = data.subscriptions[chatIdStr];
            if (existingActive) {
                existingActive.points = (existingActive.points || 0) + (userSub.points || 0);
                if (userSub.subscriptionDays > (existingActive.subscriptionDays || 0)) {
                    existingActive.subscriptionDays = userSub.subscriptionDays;
                    existingActive.subscriptionExpires = userSub.subscriptionExpires;
                }
                if (userSub.username) existingActive.username = userSub.username;
                
                // CRUCIAL: Preserve existing reports!
                if (!existingActive.reports) existingActive.reports = [];
                if (userSub.reports && userSub.reports.length > 0) {
                    existingActive.reports = [...existingActive.reports, ...userSub.reports];
                }
                
                data.subscriptions[chatIdStr] = existingActive;
                userSub = existingActive; // update the local reference
            } else {
                data.subscriptions[chatIdStr] = userSub;
            }
            delete data.subscriptions[foundChatId];
        }
        
        data.subscriptions[chatIdStr].updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
    } else {
        const now = new Date();
        const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        userSub = {
            points: 0,
            subscriptionDays: 365,
            subscriptionExpires: expires.toISOString(),
            username: cleanedUsername,
            reports: [],
            referredBy: referrerId ? referrerId.toString() : null,
            referralsCount: 0,
            referralPoints: 0,
            updatedAt: now.toISOString()
        };
        
        // If referred by someone, increment their referralsCount
        if (referrerId) {
            const rId = referrerId.toString();
            if (data.subscriptions[rId]) {
                data.subscriptions[rId].referralsCount = (data.subscriptions[rId].referralsCount || 0) + 1;
                data.subscriptions[rId].updatedAt = now.toISOString();
            }
        }
        
        data.subscriptions[chatIdStr] = userSub;
        await saveLocalSubscriptions(data);
    }
    
    return { chatId: chatIdStr, ...userSub };
};

// Add or renew subscription for Username
const addSubscriptionByUsername = async (username, days) => {
    const data = await loadLocalSubscriptions();
    const cleaned = username.replace(/^@/, '').toLowerCase();
    
    let foundChatId = null;
    let userSub = null;
    
    for (const [cid, sub] of Object.entries(data.subscriptions)) {
        if (sub.username && sub.username.toLowerCase() === cleaned) {
            userSub = sub;
            foundChatId = cid;
            break;
        }
    }
    
    const now = new Date();
    let baseDate = now;
    
    if (userSub) {
        userSub = normalizeSubscription(userSub);
        if (userSub.subscriptionExpires) {
            const currentExpires = new Date(userSub.subscriptionExpires);
            if (currentExpires > now) {
                baseDate = currentExpires;
            }
        }
    } else {
        userSub = {
            points: 0,
            subscriptionDays: 0,
            subscriptionExpires: null,
            username: cleaned,
            reports: [],
            referredBy: null,
            referralsCount: 0,
            referralPoints: 0,
            updatedAt: now.toISOString()
        };
        foundChatId = `pending_${cleaned}`;
    }
    
    const expires = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    userSub.subscriptionExpires = expires.toISOString();
    userSub.subscriptionDays = getDaysRemaining(userSub.subscriptionExpires);
    userSub.updatedAt = now.toISOString();
    
    // Referral rewards!
    if (userSub.referredBy && !userSub.referralAwarded) {
        const referrerId = userSub.referredBy.toString();
        if (data.subscriptions[referrerId]) {
            // Determine reward points based on subscription days
            let rewardPoints = 0;
            if (days === 30) rewardPoints = 50;
            else if (days === 90) rewardPoints = 150;
            else if (days === 180) rewardPoints = 300;
            else if (days >= 365) rewardPoints = 600;
            
            if (rewardPoints > 0) {
                data.subscriptions[referrerId].referralPoints = (data.subscriptions[referrerId].referralPoints || 0) + rewardPoints;
                data.subscriptions[referrerId].points = (data.subscriptions[referrerId].points || 0) + rewardPoints;
                data.subscriptions[referrerId].updatedAt = now.toISOString();
                userSub.referralAwarded = true; // prevent multiple awards from the same user's first activation
                
                // Notify referrer
                try {
                    await bot.sendMessage(referrerId, `🎁 لقد حصلت على ${rewardPoints} نقطة مجانية كمكافأة لأن المستخدم @${username} الذي قمت بدعوته قام بالاشتراك!`);
                } catch (e) {
                    console.warn('Could not notify referrer:', e.message);
                }
            }
        }
    }
    
    data.subscriptions[foundChatId] = userSub;
    await saveLocalSubscriptions(data);
    
    return { chatId: foundChatId, ...userSub };
};

// Initialize Telegram Bot
// Consider the app to be in production when a proper WEB_APP_URL is provided
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const isProduction = Boolean(WEB_APP_URL) && WEB_APP_URL.startsWith('https://') && !WEB_APP_URL.includes('localhost');
const bot = new TelegramBot(TOKEN, { 
    polling: !isProduction,
    request: {
        timeout: 30000 // 30 seconds to prevent ConnectTimeoutError crashes
    }
});

bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('Telegram webhook error:', error.message);
});

// Helper: Send User Status Message
const sendMyStatusMessage = async (chatId, username) => {
    const user = await findSubscription(chatId, username);
    const daysLeft = user.subscriptionDays || 0;
    const statusText = daysLeft > 0 ? `فعال (${daysLeft} يوم متبقي)` : 'غير فعال (0 يوم)';
    const subStatusIcon = daysLeft > 0 ? '✅' : '❌';

    const statusMsg = `📊 حالة حسابك في منصة صحة:

${subStatusIcon} حالة الاشتراك: ${statusText}
⏳ الأيام المتبقية: ${daysLeft} يوم

🌑 رصيد النقاط: ${user.points || 0} نقطة
• تكلفة إنشاء التقرير: 5 نقاط

💡 يمكنك استخدام النقاط لإنشاء التقارير دون الحاجة لاشتراك شهري، أو الاشتراك بالباقة اللامحدودة!`;

    await bot.sendMessage(chatId, statusMsg);
};

// Start Command Handler
const handleStartCommand = async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    const displayName = msg.from?.first_name || (username ? `${username}` : 'مستخدم');

    const text = msg.text || '';
    const refMatch = text.match(/\/start\s+ref_(\d+)/i);
    let referrerId = null;
    if (refMatch) {
        referrerId = refMatch[1];
    }

    const user = await findSubscription(chatId, username || displayName, referrerId);

    // Force update Chat Menu Button (Open button) to Render URL on every /start
    configureChatMenuButton(chatId).catch(err => console.warn('Menu button configure notice:', err.message));

    // Message 1: Quick Access Reply Keyboard Configuration with direct WebApp button
    await bot.sendMessage(chatId, `⚡ تم تفعيل قائمة الوصول السريع أسفل الشاشة!`, {
        reply_markup: {
            keyboard: [
                [{ text: '🛒 متجر الباقات' }, { text: '🔗 كسب نقاط (الإحالات)' }],
                [{ text: '📊 حالة حسابي' }]
            ],
            resize_keyboard: true
        }
    });

    // Message 2: Dynamic status welcome message with full inline keyboard & direct links
    const daysLeft = user.subscriptionDays || 0;
    const statusIcon = daysLeft > 0 ? '✅' : '❌';
    const statusText = daysLeft > 0 ? `فعال - متبقي ${daysLeft} يوم` : `غير فعال - متبقي 0 يوم`;
    
    let adminNotice = '';
    if (user.isNewlyMigrated) {
        adminNotice = '🎉 <b>تم تفعيل اشتراكك يدوياً من قبل الإدارة!</b> 🥳\n\n';
        // Clean up flag so it doesn't stay in memory forever
        delete user.isNewlyMigrated;
        // Optionally save to remove the flag from disk if it got saved
        const data = await loadLocalSubscriptions();
        if (data.subscriptions[chatId]) {
            delete data.subscriptions[chatId].isNewlyMigrated;
            await saveLocalSubscriptions(data);
        }
    }
    
    const welcomeText = `${adminNotice}👋 أهلاً بعودتك ${displayName}!

${statusIcon} اشتراكك ${statusText}
🌑 رصيدك الحالي من النقاط: ${user.points || 0} نقطة
• تكلفة التقرير الواحد: 5 نقاط.

💡 يمكنك الاشتراك بالباقة الشهرية لإنشاء غير محدود، أو شحن النقاط للشراء بالتقرير!

اضغط على الأزرار أدناه لفتح التطبيق أو التصفح ⚡`;

    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: 'دعوة صديق 🎁', callback_data: 'referrals' }],
                [{ text: 'باقات الاشتراك 💎', callback_data: 'packages' }],
                [{ text: 'حالة حسابي 📊', callback_data: 'mystatus' }]
            ]
        }
    });
};

bot.onText(/^\/start(\/verify)?(@\w+)?(\s.*)?$/i, handleStartCommand);

// /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id.toString();
    await bot.sendMessage(chatId, `مرحباً!\nاستخدم /start للبدء.\nإذا كنت مسؤولاً، يمكنك استخدام /addsub @username <days> لتفعيل الاشتراك.`);
});

// /buy command
bot.onText(/\/buy/, async (msg) => {
    const chatId = msg.chat.id.toString();
    await sendPackagesMessage(chatId);
});

// /admin command
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) {
        await bot.sendMessage(chatId, 'عذراً، هذه القائمة للمسؤول فقط.');
        return;
    }
    
    currentAdminToken = crypto.randomBytes(16).toString('hex');
    const adminUrl = `${process.env.APP_URL || 'https://seha-sickleave-app.onrender.com'}/index.html?screen=admin&token=${currentAdminToken}`;
    
        const inquiryUrl = `${process.env.APP_URL || 'https://seha-sickleave.onrender.com'}/inquiry`;
    const inlineKeyboard = [
        [{ text: 'Open', web_app: { url: adminUrl } }],
        [{ text: 'Open', web_app: { url: inquiryUrl } }]
    ];
    
    await bot.sendMessage(chatId, 'مرحباً بك يا مدير النظام! اضغط على الزر أدناه لفتح لوحة تحكم المشتركين:', {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
});

// Admin commands to add subscriptions
bot.onText(/\/addsub\s+@?(\w+)\s+(\d+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) {
        await bot.sendMessage(chatId, 'ليس لديك صلاحية المسؤول لتنفيذ هذا الأمر.');
        return;
    }

    const targetUsername = match[1];
    const days = parseInt(match[2], 10);
    if (!targetUsername || isNaN(days) || days <= 0) {
        await bot.sendMessage(chatId, 'يرجى استخدام الصيغة الصحيحة: /addsub @username 30');
        return;
    }

    const result = await addSubscriptionByUsername(targetUsername, days);
    await bot.sendMessage(chatId, `✅ تم تفعيل الاشتراك بنجاح للمستخدم @${targetUsername} لمدة ${days} يوم.`);
    
    if (result.chatId && !result.chatId.startsWith('pending_')) {
        try {
            await bot.sendMessage(result.chatId, `🎉 تم تفعيل اشتراكك لامحدود لمدة ${days} يوم من قبل الإدارة!\nيمكنك الآن استخراج تقارير بلا حدود طوال فترة الاشتراك.\nافتح التطبيق عبر قائمة البوت.`);
        } catch (e) {
            console.warn('Could not send notification to user:', e.message);
        }
    }
});


// Admin command to add points
bot.onText(/\/addpoints\s+@?(\w+)\s+(\d+)/i, async (msg, match) => {
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
        
        await bot.sendMessage(chatId, `✅ تم إضافة ${pointsToAdd} نقطة بنجاح للمستخدم @${targetUsername}. الرصيد الجديد: ${user.points} نقطة.`);
        
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, `🎉 تم شحن رصيدك بـ ${pointsToAdd} نقطة من قبل الإدارة! 
رصيدك الحالي أصبح ${user.points} نقطة.
يمكنك استخراج التقارير الآن.`);
            } catch (e) {
                console.warn('Could not notify user of added points:', e.message);
            }
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ حدث خطأ أثناء إضافة النقاط: ' + err.message);
    }
});


// /mysub command
bot.onText(/\/mysub/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'مستخدم';
    const user = await findSubscription(chatId, username);
    const status = user.subscriptionDays > 0 ? `اشتراكك نشط، متبقي ${user.subscriptionDays} يوم.` : 'اشتراكك غير نشط أو انتهى. الرجاء التواصل لتفعيل الاشتراك.';
    await bot.sendMessage(chatId, status);
});

// Bottom Keyboard & Message Handlers
bot.on('message', async (msg) => {
    if (!msg.text) return;
    if (/^\/start/i.test(msg.text)) return; // Already handled
    if (/^\/mysub/i.test(msg.text)) return; // Already handled
    if (/^\/admin/i.test(msg.text)) return; // Already handled
    if (/^\/addsub/i.test(msg.text)) return; // Already handled
    if (/^\/help/i.test(msg.text)) return; // Already handled
    if (/^\/buy/i.test(msg.text)) return; // Already handled
    
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'مستخدم';
    
    if (msg.text === '📊 حالة حسابي') {
        await sendMyStatusMessage(chatId, username);
        return;
    }
    
    if (msg.text === '🔗 كسب نقاط (الإحالات)') {
        await sendReferralMessage(chatId, username);
        return;
    }
    
    if (msg.text === '🛒 متجر الباقات') {
        await sendPackagesMessage(chatId);
        return;
    }
    
    console.log(`Telegram bot message received: "${msg.text}" from ${msg.from?.username || msg.from?.first_name}`);
});

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id.toString();
    const photo = msg.photo[msg.photo.length - 1]; // get highest resolution
    const fileId = photo.file_id;
    
    const inlineKeyboard = {
        inline_keyboard: [
            [{ text: "تعيين كشعار وزارة الصحة (MoH)", callback_data: `setlogo_moh_${fileId}` }],
            [{ text: "تعيين كشعار المستشفى", callback_data: `setlogo_hosp_${fileId}` }],
            [{ text: "إلغاء", callback_data: "cancel_logo" }]
        ]
    };
    
    await bot.sendMessage(chatId, "ماذا تريد أن تفعل بهذه الصورة؟", { reply_markup: inlineKeyboard });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data;
    
    if (data === "cancel_logo") {
        await bot.deleteMessage(chatId, query.message.message_id);
        return;
    }
    
    if (data.startsWith('setlogo_')) {
        const parts = data.split('_');
        const type = parts[1]; // moh or hosp
        const fileId = parts.slice(2).join('_');
        
        try {
            const fileLink = await bot.getFileLink(fileId);
            
            const subs = await loadLocalSubscriptions();
            if (!subs.subscriptions[chatId]) {
                subs.subscriptions[chatId] = { points: 0, subscriptionDays: 0, reports: [] };
            }
            
            if (type === 'moh') {
                subs.subscriptions[chatId].mohLogo = fileLink;
                await bot.answerCallbackQuery(query.id, { text: "تم تعيين شعار وزارة الصحة بنجاح ✅" });
            } else if (type === 'hosp') {
                subs.subscriptions[chatId].hospitalLogo = fileLink;
                await bot.answerCallbackQuery(query.id, { text: "تم تعيين شعار المستشفى بنجاح ✅" });
            }
            
            await saveLocalSubscriptions(subs);
            await bot.deleteMessage(chatId, query.message.message_id);
            await bot.sendMessage(chatId, "تم حفظ الشعار في حسابك بنجاح! سيتم استخدامه في التقارير القادمة. ✅\nيرجى إعادة فتح التطبيق لتحديث الشعارات.");
        } catch (e) {
            console.error(e);
            await bot.answerCallbackQuery(query.id, { text: "حدث خطأ أثناء حفظ الشعار ❌" });
        }
    }
});


// Admin command to cancel subscription
bot.onText(/\/cancelsub\s+@?(\w+)/i, async (msg, match) => {
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
        
        await bot.sendMessage(chatId, `✅ تم إلغاء الاشتراك اللامحدود للمستخدم @${targetUsername} بنجاح.`);
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, `⚠️ تم إلغاء اشتراكك اللامحدود من قبل الإدارة. يرجى تجديد الاشتراك للتمكن من استخراج التقارير.`);
            } catch(e){}
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});

// Admin command to remove points
bot.onText(/\/removepoints\s+@?(\w+)/i, async (msg, match) => {
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
        
        await bot.sendMessage(chatId, `✅ تم تصفير نقاط المستخدم @${targetUsername} بنجاح.`);
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, `⚠️ تم سحب نقاطك من قبل الإدارة. يرجى الشحن للتمكن من استخراج التقارير.`);
            } catch(e){}
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});

// Admin command to list subscribers
bot.onText(/\/subscribers/i, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    const allowedAdmins = [ADMIN_USERNAME.toLowerCase(), 'zakaria_2025', 'zakmmm_1211'];
    if (!username || !allowedAdmins.includes(username.toLowerCase())) return;

    try {
        const data = await loadLocalSubscriptions();
        let message = '📋 **قائمة المشتركين الفعالين:**\n\n';
        let count = 0;
        
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            const norm = normalizeSubscription(sub);
            if (norm.subscriptionDays > 0 || (norm.points && norm.points > 0)) {
                count++;
                message += `👤 @${norm.username || 'مجهول'} (${cid})\n`;
                if (norm.subscriptionDays > 0) message += ` └ 🗓 اشتراك: ${norm.subscriptionDays} يوم\n`;
                if (norm.points > 0) message += ` └ 🪙 نقاط: ${norm.points} نقطة\n`;
                message += '\n';
            }
        }
        
        if (count === 0) {
            message += 'لا يوجد مشتركين فعالين حالياً.';
        } else {
            message += `إجمالي الفعالين: ${count}`;
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


// Helper: Send Referral Statistics & Link
const sendReferralMessage = async (chatId, username) => {
    const user = await findSubscription(chatId, username);
    const botInfo = await bot.getMe();
    const botUsername = botInfo.username || 'zakmmm_1211_bot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${chatId}`;

    // Calculate actual referrals
    const data = await loadLocalSubscriptions();
    let referralsCount = 0;
    for (const sub of Object.values(data.subscriptions)) {
        if (sub.referredBy === chatId) {
            referralsCount++;
        }
    }

    const referralMsg = `🔗 نظام الإحالات والمكافآت (Referral System)

شارك رابط إحالتك الفريد مع أصدقائك، واربح نقاطاً إضافية لإنشاء التقارير في كل مرة يقومون فيها بالاشتراك!

🔗 رابط إحالتك الخاص بك:
${referralLink}

📊 إحصائيات إحالتك:
• عدد الأشخاص المسجلين من خلالك: ${referralsCount} شخص
• رصيدك الحالي من نقاط الإحالة: ${user.referralPoints || 0} نقطة

🎁 كيف تربح النقاط؟
عندما يقوم شخص قمت بإحالته بأي عملية شراء، ستحصل أنت على المكافآت التالية تلقائياً في كل مرة يشتري فيها:
• خطة Month 1 (100.0 ريال) -> تربح 50 نقطة (10 تقارير مجاناً)
• خطة Months 3 (300.0 ريال) -> تربح 150 نقطة (30 تقرير مجاناً)
• خطة Months 6 (500.0 ريال) -> تربح 300 نقطة (60 تقرير مجاناً)
• خطة Year 1 (800.0 ريال) -> تربح 600 نقطة (120 تقرير مجاناً)
• خطة حزمة النقاط الأساسية (30 نقطة) (20.0 ريال) -> تربح 10 نقاط (2 تقرير مجاناً)
• خطة حزمة النقاط الموصى بها (100 نقطة) (50.0 ريال) -> تربح 25 نقطة (5 تقارير مجاناً)
• خطة حزمة النقاط المتقدمة (200 نقطة) (80.0 ريال) -> تربح 50 نقطة (10 تقارير مجاناً)

💡 ملاحظة: لا توجد صلاحية لانتهاء النقاط، ويمكنك استخدامها في أي وقت!`;

    await bot.sendMessage(chatId, referralMsg, {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }
            ]]
        }
    });
};

// Helper: Send Packages Store Menu
const sendPackagesMessage = async (chatId) => {
    const packagesMsg = `🛒 متجر الباقات والاشتراكات لإنشاء التقارير

شحن وتفعيل الباقات يتم يدوياً عبر الدعم الفني بشكل سهل وآمن وسريع.

⭐ حزم النقاط (بدون صلاحية انتهاء):
• حزمة النقاط الأساسية (30 نقطة): 30 نقطة -> السعر: 20.0 ريال سعودي
• حزمة النقاط الموصى بها (100 نقطة): 100 نقطة -> السعر: 50.0 ريال سعودي
• حزمة النقاط المتقدمة (200 نقطة): 200 نقطة -> السعر: 80.0 ريال سعودي

📅 الاشتراكات اللامحدودة (غير محدودة التقارير):
• خطة 30 يوم -> السعر: 100.0 ريال سعودي
• خطة 90 يوم -> السعر: 300.0 ريال سعودي
• خطة 180 يوم -> السعر: 500.0 ريال سعودي
• خطة 365 يوم -> السعر: 800.0 ريال سعودي

👇 اضغط على الباقة التي تريدها للتواصل وتفعيلها فوراً:`;

    const ownerLink = `https://t.me/${ADMIN_USERNAME}`;
    const inlineKeyboard = [
        [{ text: '📅 خطة 30 يوم (100.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 30 يوم (100 ريال) لحسابي.')}` }],
        [{ text: '📅 خطة 90 يوم (300.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 90 يوم (300 ريال) لحسابي.')}` }],
        [{ text: '📅 خطة 180 يوم (500.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 180 يوم (500 ريال) لحسابي.')}` }],
        [{ text: '📅 خطة 365 يوم (800.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 365 يوم (800 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة النقاط الأساسية (30 نقطة) (20.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة النقاط الأساسية 30 نقطة (20 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة النقاط الموصى بها (100 نقطة) (50.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة النقاط الموصى بها 100 نقطة (50 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة النقاط المتقدمة (200 نقطة) (80.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة النقاط المتقدمة 200 نقطة (80 ريال) لحسابي.')}` }]
    ];

    await bot.sendMessage(chatId, packagesMsg, {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
};

// Callback Query Handler for Inline Buttons
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const username = query.from?.username || query.from?.first_name || 'مستخدم';
    
    if (query.data === 'referrals') {
        await sendReferralMessage(chatId, username);
        await bot.answerCallbackQuery(query.id);
    } else if (query.data === 'packages') {
        await sendPackagesMessage(chatId);
        await bot.answerCallbackQuery(query.id);
    } else if (query.data === 'mystatus') {
        await sendMyStatusMessage(chatId, username);
        await bot.answerCallbackQuery(query.id);
    }
});

// ==========================================\n// TELEGRAM ADMIN PANEL\n// ==========================================\nconst adminState = {};\nconst isAdmin = (cid) => cid.toString() === ADMIN_CHAT_ID;\n\nbot.onText(/\/admin/, async (msg) => {\n    const chatId = msg.chat.id.toString();\n    if (!isAdmin(chatId)) {\n        await bot.sendMessage(chatId, '⛔ ليس لديك صلاحية للوصول إلى لوحة المشرف.');\n        return;\n    }\n    await showAdminPanel(chatId);\n});\n\nasync function showAdminPanel(chatId, messageId = null) {\n    const data = await loadLocalSubscriptions();\n    const subs = Object.values(data.subscriptions).map(normalizeSubscription);\n    const total = subs.length;\n    const active = subs.filter(s => s.status === 'active').length;\n    const suspended = subs.filter(s => s.status === 'suspended').length;\n    const expired = subs.filter(s => s.status === 'expired').length;\n    \n    let totalReports = 0;\n    let totalPoints = 0;\n    subs.forEach(s => {\n        totalReports += (s.reports ? s.reports.length : 0);\n        if (s.subscription_type === 'points') totalPoints += (s.balance_points || 0);\n    });\n\n    const text = '🔐 *لوحة تحكم المشرف*\n\n' +\n        '👥 المشتركين: ' + total + '\n' +\n        '🟢 الفعالون: ' + active + '\n' +\n        '🔴 الموقوفون: ' + suspended + '\n' +\n        '⚠️ المنتهية: ' + expired + '\n' +\n        '📄 إجمالي التقارير: ' + totalReports + '\n' +\n        '⭐ إجمالي النقاط: ' + totalPoints;\n\n    const opts = {\n        parse_mode: 'Markdown',\n        reply_markup: {\n            inline_keyboard: [\n                [{ text: '👥 إدارة المشتركين', callback_data: 'admin_users' }],\n                [{ text: '➕ إضافة مشترك', callback_data: 'admin_add_user' }],\n                [{ text: '🔎 البحث عن مشترك', callback_data: 'admin_search' }],\n                [{ text: '📊 الإحصائيات', callback_data: 'admin_stats' }],\n                [{ text: '📋 سجل العمليات', callback_data: 'admin_logs_all_0' }],\n                [{ text: '🔄 تحديث', callback_data: 'admin_refresh' }]\n            ]\n        }\n    };\n\n    if (messageId) {\n        try {\n            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...opts });\n        } catch (e) { /* ignore if not modified */ }\n    } else {\n        await bot.sendMessage(chatId, text, opts);\n    }\n}\n\nbot.on('callback_query', async (query) => {\n    const chatId = query.message.chat.id.toString();\n    const data = query.data;\n\n    if (data.startsWith('admin_')) {\n        if (!isAdmin(chatId)) {\n            await bot.answerCallbackQuery(query.id, { text: '⛔ ليس لديك صلاحية.', show_alert: true });\n            return;\n        }\n\n        if (data === 'admin_main' || data === 'admin_refresh') {\n            await showAdminPanel(chatId, query.message.message_id);\n            await bot.answerCallbackQuery(query.id);\n            return;\n        }\n\n        if (data === 'admin_users') {\n            const opts = {\n                reply_markup: {\n                    inline_keyboard: [\n                        [{ text: '🔎 البحث بـ Chat ID', callback_data: 'admin_search' }],\n                        [{ text: '➕ إضافة مشترك', callback_data: 'admin_add_user' }],\n                        [{ text: '📋 جميع المشتركين', callback_data: 'admin_users_list_0' }],\n                        [{ text: '🔙 رجوع', callback_data: 'admin_main' }]\n                    ]\n                }\n            };\n            await bot.editMessageText('👥 *إدارة المشتركين*', { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', ...opts });\n            await bot.answerCallbackQuery(query.id);\n            return;\n        }\n\n        if (data.startsWith('admin_users_list_')) {\n            const page = parseInt(data.split('_').pop());\n            const db = await loadLocalSubscriptions();\n            const subs = Object.entries(db.subscriptions).map(([cid, s]) => ({cid, ...normalizeSubscription(s)})).filter(s => !s.cid.startsWith('pending_'));\n            \n            const perPage = 5;\n            const totalPages = Math.ceil(subs.length / perPage) || 1;\n            const start = page * perPage;\n            const pagedSubs = subs.slice(start, start + perPage);\n\n            let text = '📋 *جميع المشتركين* (صفحة ' + (page + 1) + '/' + totalPages + ')\n\n';\n            const keyboard = [];\n\n            pagedSubs.forEach(s => {\n                const icon = s.status === 'active' ? '🟢' : (s.status === 'suspended' ? '🔴' : '⚠️');\n                const typeIcon = s.subscription_type === 'points' ? '⭐' : '♾️';\n                const reports = s.reports ? s.reports.length : 0;\n                const balance = s.subscription_type === 'points' ? (' - ' + s.balance_points + ' نقطة') : '';\n                text += icon + ' [' + s.cid + '] ' + (s.username ? '@'+s.username : '') + '\n' +\n                        typeIcon + ' ' + (s.subscription_type === 'points' ? 'نقاط' : 'غير محدود') + balance + ' - 📄 ' + reports + ' تقرير\n\n';\n                keyboard.push([{ text: '👤 إدارة ' + s.cid, callback_data: 'admin_user_' + s.cid }]);\n            });\n\n            const navRow = [];\n            if (page > 0) navRow.push({ text: '◀️ السابق', callback_data: 'admin_users_list_' + (page - 1) });\n            if (page < totalPages - 1) navRow.push({ text: 'التالي ▶️', callback_data: 'admin_users_list_' + (page + 1) });\n            if (navRow.length > 0) keyboard.push(navRow);\n            keyboard.push([{ text: '🔙 رجوع', callback_data: 'admin_users' }]);\n\n            await bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });\n            await bot.answerCallbackQuery(query.id);\n            return;\n        }\n\n        if (data === 'admin_search' || data === 'admin_add_user') {\n            adminState[chatId] = { step: data === 'admin_search' ? 'SEARCH_CHAT_ID' : 'ADD_USER_CHAT_ID' };\n            await bot.sendMessage(chatId, data === 'admin_search' ? 'أرسل Chat ID الخاص بالمشترك للبحث:' : 'أرسل Chat ID للمشترك الجديد:', { reply_markup: { inline_keyboard: [[{ text: 'إلغاء', callback_data: 'admin_main' }]] } });\n            await bot.answerCallbackQuery(query.id);\n            return;\n        }\n\n        if (data.startsWith('admin_user_')) {\n            const parts = data.split('_');\n            if (parts.length === 3) {\n                const targetId = parts[2];\n                await showUserPanel(chatId, targetId, query.message.message_id);\n            } else {\n                const action = parts[2];\n                const targetId = parts[3];\n                const db = await loadLocalSubscriptions();\n                const sub = db.subscriptions[targetId];\n                \n                if (!sub) {\n                    await bot.answerCallbackQuery(query.id, { text: 'غير موجود!', show_alert: true });\n                    return;\n                }\n\n                if (action === 'toggle') {\n                    sub.status = sub.status === 'active' ? 'suspended' : 'active';\n                    logTransaction(sub, targetId, 'status_change', 0, 'تغيير الحالة إلى ' + sub.status, 'admin');\n                    await saveLocalSubscriptions(db);\n                    await showUserPanel(chatId, targetId, query.message.message_id);\n                } else if (action === 'cancel') {\n                    sub.status = 'expired';\n                    sub.subscription_end_date = new Date().toISOString();\n                    logTransaction(sub, targetId, 'status_change', 0, 'إلغاء الاشتراك', 'admin');\n                    await saveLocalSubscriptions(db);\n                    await showUserPanel(chatId, targetId, query.message.message_id);\n                } else if (action === 'addpoints' || action === 'removepoints' || action === 'changetype') {\n                    adminState[chatId] = { step: action.toUpperCase(), targetId, msgId: query.message.message_id };\n                    let prompt = '';\n                    if (action === 'addpoints') prompt = 'كم عدد النقاط التي تريد إضافتها؟';\n                    if (action === 'removepoints') prompt = 'كم عدد النقاط التي تريد خصمها؟';\n                    if (action === 'changetype') prompt = 'أرسل النوع الجديد: points أو unlimited\nإذا كان نقاط، أرسل: points,1000,30 (النوع،الرصيد،الأيام)\nإذا كان غير محدود: unlimited,30 (النوع،الأيام)';\n                    \n                    await bot.sendMessage(chatId, prompt, { reply_markup: { inline_keyboard: [[{ text: 'إلغاء', callback_data: 'admin_user_' + targetId }]] } });\n                } else if (action === 'logs') {\n                    const page = parseInt(parts[4] || 0);\n                    await showUserLogs(chatId, targetId, page, query.message.message_id);\n                }\n            }\n            await bot.answerCallbackQuery(query.id);\n            return;\n        }\n\n    }\n});\n\nfunction logTransaction(sub, cid, type, amount, reason, by) {\n    if (!sub.transactions) sub.transactions = [];\n    sub.transactions.push({\n        id: 'txn_' + Date.now() + Math.floor(Math.random()*1000),\n        chat_id: cid,\n        type,\n        amount,\n        balance_before: sub.balance_points || 0,\n        balance_after: (sub.balance_points || 0) + (type==='points_remove'? -amount : amount),\n        reason,\n        performed_by: by,\n        created_at: new Date().toISOString()\n    });\n}\n\nasync function showUserLogs(chatId, targetId, page, messageId) {\n    const db = await loadLocalSubscriptions();\n    const sub = normalizeSubscription(db.subscriptions[targetId]);\n    if (!sub) return;\n    \n    const txns = [...(sub.transactions || [])].reverse();\n    const perPage = 5;\n    const totalPages = Math.ceil(txns.length / perPage) || 1;\n    const paged = txns.slice(page * perPage, page * perPage + perPage);\n    \n    let text = '📋 *سجل عمليات* ' + targetId + '\n\n';\n    paged.forEach(t => {\n        text += '📅 ' + new Date(t.created_at).toLocaleString() + '\n' +\n                'العملية: ' + t.reason + '\n' +\n                'المبلغ: ' + t.amount + '\n' +\n                'الرصيد: ' + t.balance_before + ' -> ' + t.balance_after + '\n' +\n                'بواسطة: ' + t.performed_by + '\n\n';\n    });\n    if(txns.length === 0) text += 'لا توجد عمليات.';\n\n    const navRow = [];\n    if (page > 0) navRow.push({ text: '◀️ السابق', callback_data: 'admin_user_logs_' + targetId + '_' + (page - 1) });\n    if (page < totalPages - 1) navRow.push({ text: 'التالي ▶️', callback_data: 'admin_user_logs_' + targetId + '_' + (page + 1) });\n    \n    const keyboard = [];\n    if (navRow.length > 0) keyboard.push(navRow);\n    keyboard.push([{ text: '🔙 رجوع للمشترك', callback_data: 'admin_user_' + targetId }]);\n\n    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });\n}\n\nasync function showUserPanel(chatId, targetId, messageId) {\n    const db = await loadLocalSubscriptions();\n    const sub = normalizeSubscription(db.subscriptions[targetId]);\n    if (!sub) {\n        const kb = { inline_keyboard: [[{ text: 'رجوع', callback_data: 'admin_main'}]] };\n        if (messageId) {\n            await bot.editMessageText('⛔ المشترك غير موجود.', { chat_id: chatId, message_id: messageId, reply_markup: kb });\n        } else {\n            await bot.sendMessage(chatId, '⛔ المشترك غير موجود.', { reply_markup: kb });\n        }\n        return;\n    }\n\n    const icon = sub.status === 'active' ? '🟢 فعال' : (sub.status === 'suspended' ? '🔴 موقوف' : '⚠️ منتهي');\n    const type = sub.subscription_type === 'points' ? '⭐ بالنقاط' : '♾️ غير محدود';\n    const repCount = sub.reports ? sub.reports.length : 0;\n    const daysLeft = sub.subscriptionDays;\n    \n    const text = '👤 *بيانات المشترك*\n' +\n                 'Chat ID: `' + targetId + '`\n' +\n                 'Username: ' + (sub.username ? '@'+sub.username : 'لا يوجد') + '\n' +\n                 'الحالة: ' + icon + '\n' +\n                 'نوع الاشتراك: ' + type + '\n' +\n                 'الرصيد الحالي: ' + sub.balance_points + ' نقطة\n' +\n                 'مدة الاشتراك: ' + Math.ceil((new Date(sub.subscription_end_date) - new Date(sub.subscription_start_date)) / 86400000) + ' يوم\n' +\n                 'الأيام المستخدمة: ' + sub.daysUsed + ' يوم\n' +\n                 'الأيام المتبقية: ' + daysLeft + ' يوم\n' +\n                 'البداية: ' + new Date(sub.subscription_start_date).toLocaleDateString() + '\n' +\n                 'النهاية: ' + new Date(sub.subscription_end_date).toLocaleDateString() + '\n' +\n                 'عدد التقارير: ' + repCount;\n\n    const keyboard = [\n        [{ text: '➕ إضافة نقاط', callback_data: 'admin_user_addpoints_' + targetId }, { text: '➖ خصم نقاط', callback_data: 'admin_user_removepoints_' + targetId }],\n        [{ text: '🔄 تغيير نوع الاشتراك', callback_data: 'admin_user_changetype_' + targetId }],\n        [{ text: '📋 سجل العمليات', callback_data: 'admin_user_logs_' + targetId + '_0' }],\n        [{ text: sub.status === 'active' ? '⏸️ إيقاف' : '▶️ تفعيل', callback_data: 'admin_user_toggle_' + targetId }, { text: '❌ إلغاء الاشتراك', callback_data: 'admin_user_cancel_' + targetId }],\n        [{ text: '🔙 رجوع للقائمة', callback_data: 'admin_users_list_0' }]\n    ];\n\n    if (messageId) {\n        try {\n            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });\n        } catch(e){}\n    } else {\n        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });\n    }\n}\n\nbot.on('message', async (msg) => {\n    if (!msg.text) return;\n    const chatId = msg.chat.id.toString();\n    if (!isAdmin(chatId)) return;\n    \n    const state = adminState[chatId];\n    if (!state) return;\n\n    if (state.step === 'SEARCH_CHAT_ID' || state.step === 'ADD_USER_CHAT_ID') {\n        const targetId = msg.text.trim();\n        if (!/^\d+$/.test(targetId)) {\n            await bot.sendMessage(chatId, 'يرجى إرسال Chat ID رقمي صحيح.');\n            return;\n        }\n        \n        if (state.step === 'SEARCH_CHAT_ID') {\n            const db = await loadLocalSubscriptions();\n            if (db.subscriptions[targetId]) {\n                await bot.sendMessage(chatId, 'جاري جلب البيانات...');\n                await showUserPanel(chatId, targetId, null);\n            } else {\n                await bot.sendMessage(chatId, 'المشترك غير موجود!');\n            }\n            delete adminState[chatId];\n        } else {\n            state.targetId = targetId;\n            state.step = 'ADD_USER_DETAILS';\n            await bot.sendMessage(chatId, 'أرسل بيانات الاشتراك بالصيغة التالية:\nللنقاط: points,1000,30 (النوع,الرصيد,الأيام)\nلغير المحدود: unlimited,30 (النوع,الأيام)\n\n(مع ملاحظة إذا كان للمستخدم username يمكنك إضافته هكذا: points,1000,30,@user)');\n        }\n        return;\n    }\n    \n    if (state.step === 'ADD_USER_DETAILS' || state.step === 'CHANGETYPE') {\n        const parts = msg.text.split(',');\n        const type = parts[0].trim().toLowerCase();\n        \n        let points = 0, days = 30, username = '';\n        if (type === 'points') {\n            points = parseInt(parts[1]) || 0;\n            days = parseInt(parts[2]) || 30;\n            username = parts[3] ? parts[3].trim().replace('@','') : '';\n        } else if (type === 'unlimited') {\n            days = parseInt(parts[1]) || 30;\n            username = parts[2] ? parts[2].trim().replace('@','') : '';\n        } else {\n            await bot.sendMessage(chatId, 'صيغة خاطئة. يجب أن تبدأ بـ points أو unlimited.');\n            return;\n        }\n\n        const db = await loadLocalSubscriptions();\n        const targetId = state.targetId;\n        const now = new Date();\n        const end = new Date(now.getTime() + days * 86400000).toISOString();\n        \n        if (!db.subscriptions[targetId]) {\n            db.subscriptions[targetId] = { reports: [], transactions: [] };\n        }\n        \n        const sub = db.subscriptions[targetId];\n        sub.status = 'active';\n        sub.subscription_type = type;\n        sub.balance_points = points;\n        sub.points = points;\n        sub.subscription_start_date = now.toISOString();\n        sub.subscription_end_date = end;\n        if (username) sub.username = username;\n        \n        logTransaction(sub, targetId, 'subscription_update', points, state.step === 'ADD_USER_DETAILS' ? 'إنشاء اشتراك جديد' : 'تحديث نوع الاشتراك', 'admin');\n        await saveLocalSubscriptions(db);\n        \n        await bot.sendMessage(chatId, '✅ تم حفظ بيانات المشترك بنجاح!');\n        await showUserPanel(chatId, targetId, null);\n        delete adminState[chatId];\n        return;\n    }\n\n    if (state.step === 'ADDPOINTS' || state.step === 'REMOVEPOINTS') {\n        const amount = parseInt(msg.text);\n        if (isNaN(amount) || amount <= 0) {\n            await bot.sendMessage(chatId, 'يرجى إرسال رقم صحيح أكبر من الصفر.');\n            return;\n        }\n        \n        state.amount = amount;\n        state.step = state.step === 'ADDPOINTS' ? 'ADDPOINTS_REASON' : 'REMOVEPOINTS_REASON';\n        await bot.sendMessage(chatId, 'أرسل سبب العملية:');\n        return;\n    }\n\n    if (state.step === 'ADDPOINTS_REASON' || state.step === 'REMOVEPOINTS_REASON') {\n        const reason = msg.text.trim();\n        const db = await loadLocalSubscriptions();\n        const sub = db.subscriptions[state.targetId];\n        if (sub) {\n            const isAdd = state.step === 'ADDPOINTS_REASON';\n            if (!isAdd && sub.balance_points < state.amount) {\n                await bot.sendMessage(chatId, '⛔ الرصيد الحالي أقل من المبلغ المطلوب خصمه.');\n                delete adminState[chatId];\n                return;\n            }\n            \n            if (sub.balance_points === undefined) sub.balance_points = 0;\n            const before = sub.balance_points;\n            sub.balance_points += isAdd ? state.amount : -state.amount;\n            sub.points = sub.balance_points;\n            \n            logTransaction(sub, state.targetId, isAdd ? 'points_add' : 'points_remove', state.amount, reason, 'admin');\n            await saveLocalSubscriptions(db);\n            await bot.sendMessage(chatId, '✅ تمت العملية بنجاح!');\n            await showUserPanel(chatId, state.targetId, null);\n        }\n        delete adminState[chatId];\n        return;\n    }\n});\n// ==========================================\n\n// API Endpoints

// --- NEW WEB ADMIN APIs ---
const WEB_ADMIN_TOKEN = "ZAK-99X-ADMIN-2026";

function verifyWebToken(req, res, next) {
    const token = req.headers['x-admin-token'] || req.body.token || req.query.token;
    if (token !== WEB_ADMIN_TOKEN) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
}

app.get('/api/admin/web/stats', verifyWebToken, async (req, res) => {
    try {
        const db = await loadLocalSubscriptions();
        let totalSubs = 0, activeSubs = 0, suspendedSubs = 0, expiredSubs = 0;
        let totalPoints = 0, totalReports = 0;

        for (const cid in db.subscriptions) {
            const sub = normalizeSubscription(db.subscriptions[cid]);
            totalSubs++;
            if (sub.status === 'active') activeSubs++;
            else if (sub.status === 'suspended') suspendedSubs++;
            else expiredSubs++;

            totalPoints += (sub.balance_points || 0);
            totalReports += (sub.reports ? sub.reports.length : 0);
        }

        res.json({ success: true, stats: { totalSubs, activeSubs, suspendedSubs, expiredSubs, totalPoints, totalReports } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/web/users', verifyWebToken, async (req, res) => {
    try {
        const db = await loadLocalSubscriptions();
        const users = [];
        for (const cid in db.subscriptions) {
            const sub = normalizeSubscription(db.subscriptions[cid]);
            users.push({
                chatId: cid,
                username: sub.username || '',
                status: sub.status,
                type: sub.subscription_type,
                points: sub.balance_points || 0,
                daysLeft: sub.subscriptionDays,
                reportsCount: sub.reports ? sub.reports.length : 0,
                startDate: sub.subscription_start_date,
                endDate: sub.subscription_end_date
            });
        }
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/web/user/update', express.json(), verifyWebToken, async (req, res) => {
    try {
        const { chatId, action, data } = req.body;
        const db = await loadLocalSubscriptions();
        if (!db.subscriptions[chatId]) {
            if (action === 'create') {
                db.subscriptions[chatId] = { reports: [], transactions: [] };
            } else {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
        }

        const sub = db.subscriptions[chatId];
        
        if (action === 'add_points' || action === 'remove_points') {
            const amount = parseInt(data.amount);
            if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });
            if (action === 'remove_points' && (sub.balance_points || 0) < amount) {
                return res.status(400).json({ success: false, error: 'Insufficient points' });
            }
            
            sub.balance_points = (sub.balance_points || 0) + (action === 'add_points' ? amount : -amount);
            sub.points = sub.balance_points;
            logTransaction(sub, chatId, action, amount, data.reason || 'Web Admin', 'web_admin');
        } 
        else if (action === 'toggle_status') {
            sub.status = sub.status === 'active' ? 'suspended' : 'active';
            logTransaction(sub, chatId, 'status_change', 0, 'Status changed to ' + sub.status, 'web_admin');
        }
        else if (action === 'create' || action === 'update_type') {
            const type = data.type; 
            const days = parseInt(data.days) || 30;
            const points = parseInt(data.points) || 0;
            
            const now = new Date();
            const end = new Date(now.getTime() + days * 86400000).toISOString();
            
            sub.status = 'active';
            sub.subscription_type = type;
            sub.subscription_start_date = now.toISOString();
            sub.subscription_end_date = end;
            if (type === 'points') {
                sub.balance_points = points;
                sub.points = points;
            }
            if (data.username) sub.username = data.username.replace('@','');
            
            logTransaction(sub, chatId, 'subscription_update', type === 'points' ? points : 0, 'Web Admin Update', 'web_admin');
        }

        await saveLocalSubscriptions(db);
        res.json({ success: true, user: normalizeSubscription(sub) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/web/user/:id/logs', verifyWebToken, async (req, res) => {
    try {
        const db = await loadLocalSubscriptions();
        const sub = db.subscriptions[req.params.id];
        if (!sub) return res.status(404).json({ success: false, error: 'User not found' });
        
        res.json({ success: true, logs: sub.transactions || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- END NEW WEB ADMIN APIs ---


// Admin: Add user securely
app.post('/api/admin/add-user', express.json(), async (req, res) => {
    try {
        const { token, targetUsername, points, days } = req.body;
        if (!currentAdminToken || token !== currentAdminToken) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const data = await loadLocalSubscriptions();
        const cleaned = targetUsername.replace(/^@/, '').toLowerCase();
        
        // Find if user already exists
        let foundChatId = null;
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === cleaned) {
                foundChatId = cid;
                break;
            }
        }
        
        if (!foundChatId) {
            foundChatId = `pending_${cleaned}`;
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
        user.points = (user.points || 0) + (parseInt(points) || 0);
        
        const addedDays = parseInt(days) || 0;
        if (addedDays > 0) {
            const now = new Date();
            let currentExpires = user.subscriptionExpires ? new Date(user.subscriptionExpires) : now;
            if (currentExpires < now) currentExpires = now;
            const newExpires = new Date(currentExpires.getTime() + addedDays * 24 * 60 * 60 * 1000);
            user.subscriptionExpires = newExpires.toISOString();
            user.subscriptionDays = getDaysRemaining(newExpires.toISOString());
        }
        
        await saveLocalSubscriptions(data);
        
        if (!foundChatId.startsWith('pending_')) {
            try {
                let notifyMsg = '🎉 تم تحديث اشتراكك من قبل الإدارة!\n';
                if (addedDays > 0) notifyMsg += `✅ تم تفعيل اشتراك لامحدود لمدة ${addedDays} يوم.\n`;
                if (parseInt(points) > 0) notifyMsg += `✅ تم إضافة ${points} نقطة لرصيدك.\n`;
                notifyMsg += 'يمكنك الآن الاستمتاع بخدمات البوت.';
                
                // Use a non-blocking message send
                bot.sendMessage(foundChatId, notifyMsg).catch(e => console.warn('Could not send to user from API:', e.message));
            } catch(e) {}
        }

        res.json({ success: true, message: 'تم التفعيل بنجاح!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// 1. Get User State
app.get('/api/user/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const username = req.query.username;
        const user = await findSubscription(chatId, username);
        res.json({ success: true, user, reports: user.reports || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 1.5 Generate PDF / Save Report Draft
app.post('/api/generate', async (req, res) => {
    try {
        const { chatId, report } = req.body;
        if (!chatId || !report) return res.status(400).json({ success: false, error: 'Invalid data' });

        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();

        if (!data.subscriptions[chatIdStr]) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);

        if (!userSub.reports) {
            userSub.reports = [];
        }

        const index = userSub.reports.findIndex(r => r.id === report.id);
        const isUpdate = (index >= 0);
        
        if (isUpdate) {
            const existingReport = userSub.reports[index];
            if (existingReport.issueDate) {
                const issueDateObj = new Date(existingReport.issueDate);
                const now = new Date();
                if ((now - issueDateObj) > (2 * 24 * 60 * 60 * 1000)) {
                    return res.status(403).json({ success: false, error: 'لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.' });
                }
            }
        }

        if (!isUpdate) {
            // New report validation
            if (normalized.subscriptionDays <= 0 && (normalized.points || 0) < 5) {
                return res.status(403).json({ success: false, error: 'عذراً، رصيدك غير كافٍ. تحتاج 5 نقاط لإصدار تقرير جديد.' });
            }
            if (normalized.subscriptionDays <= 0) {
                userSub.points = (userSub.points || 0) - 5;
            }
        }

        if (isUpdate) {
            userSub.reports[index] = report;
        } else {
            userSub.reports.push(report);
        }

        userSub.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        res.json({ success: true, report, generatedAt: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Secure Admin Endpoint to Add Packages

// --- Inquiry Endpoint ---
app.get('/inquiry', (req, res) => {
    res.sendFile(path.join(__dirname, 'inquiry.html'));
});

app.post('/api/inquiry', async (req, res) => {
    try {
        const rawLeaveId = req.body.leaveId || req.body.service_code || '';
        const rawNationalId = req.body.nationalId || req.body.national_id || '';
        
        const leaveId = String(rawLeaveId).trim();
        const nationalId = String(rawNationalId).trim();

        if (!leaveId || !nationalId) {
            return res.json({ success: false, error: 'الرجاء إدخال الرمز ورقم الهوية.' });
        }

        const data = await loadLocalSubscriptions();
        
        let foundLeaveIdMatch = false;
        let foundReport = null;
        
        for (const chatId in data.subscriptions) {
            const sub = data.subscriptions[chatId];
            if (sub.reports && Array.isArray(sub.reports)) {
                for (const r of sub.reports) {
                    if (r.id === leaveId) {
                        foundLeaveIdMatch = true;
                        const storedNationalId = r.data && r.data.national_id ? String(r.data.national_id).trim() : '';
                        if (storedNationalId === nationalId) {
                            foundReport = r;
                            break;
                        }
                    }
                }
            }
            if (foundReport) break;
        }

        if (foundReport) {
            res.json({ success: true, report: foundReport });
        } else if (foundLeaveIdMatch) {
            res.json({ success: false, error: 'بيانات الاستعلام غير متطابقة.' });
        } else {
            res.json({ success: false, error: 'لم يتم العثور على إجازة بهذا الرمز.' });
        }
    } catch (err) {
        console.error("Inquiry Error:", err);
        res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ مؤقت أثناء الاستعلام، يرجى المحاولة مرة أخرى.', 
            details: err.message 
        });
    }
});

app.post('/api/admin/package', async (req, res) => {
    try {
        const { token, chatId, points, subscriptionDays } = req.body;
        
        // Allow either the dynamic token or the master secret password
        if (token !== currentAdminToken && token !== 'ZAK-99X-ADMIN-2026') {
            return res.status(401).json({ success: false, error: 'الرمز السري غير صحيح!' });
        }
        
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (!data.subscriptions[chatIdStr]) {
            data.subscriptions[chatIdStr] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: null,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        if (subscriptionDays > 0) {
            const now = new Date();
            let currentExpires = normalized.subscriptionExpires ? new Date(normalized.subscriptionExpires) : now;
            if (currentExpires < now) currentExpires = now;
            currentExpires.setDate(currentExpires.getDate() + subscriptionDays);
            normalized.subscriptionExpires = currentExpires.toISOString();
            normalized.subscriptionDays = subscriptionDays;
        }
        
        normalized.points = (normalized.points || 0) + (points || 0);
        normalized.updatedAt = new Date().toISOString();
        
        // Write back
        data.subscriptions[chatIdStr] = normalized;
        await saveLocalSubscriptions(data);
        
        res.json({ success: true, points: normalized.points, subscriptionDays: normalized.subscriptionDays });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user/:chatId/package', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { points, subscriptionDays } = req.body;
        
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (!data.subscriptions[chatIdStr]) {
            data.subscriptions[chatIdStr] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: null,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        if (subscriptionDays > 0) {
            const now = new Date();
            const baseDate = normalized.subscriptionExpires ? new Date(normalized.subscriptionExpires) : now;
            const start = baseDate > now ? baseDate : now;
            const expires = new Date(start.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);
            normalized.subscriptionExpires = expires.toISOString();
            normalized.subscriptionDays = getDaysRemaining(normalized.subscriptionExpires);
        }
        
        normalized.points = (normalized.points || 0) + (points || 0);
        normalized.updatedAt = new Date().toISOString();
        
        await saveLocalSubscriptions(data);
        res.json({ success: true, points: normalized.points, subscriptionDays: normalized.subscriptionDays });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Save Report
app.post('/api/report/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const reportData = req.body.report;
        
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (!data.subscriptions[chatIdStr]) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        if (!userSub.reports) {
            userSub.reports = [];
        }
        
        const index = userSub.reports.findIndex(r => r.id === reportData.id);
        const isUpdate = (index >= 0);
        
        if (isUpdate) {
            const existingReport = userSub.reports[index];
            if (existingReport.issueDate) {
                const issueDateObj = new Date(existingReport.issueDate);
                const now = new Date();
                if ((now - issueDateObj) > (2 * 24 * 60 * 60 * 1000)) {
                    return res.status(403).json({ success: false, error: 'لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.' });
                }
            }
        }
        
        if (!isUpdate) {
            // New report validation
            if (normalized.subscriptionDays <= 0 && (normalized.points || 0) < 5) {
                return res.status(403).json({ success: false, error: 'عذراً، رصيدك غير كافٍ. تحتاج 5 نقاط لإصدار تقرير جديد.' });
            }
            
            // Deduct 5 points if not on unlimited days
            if (normalized.subscriptionDays <= 0) {
                userSub.points = (userSub.points || 0) - 5;
            }
        }
        
        if (isUpdate) {
            userSub.reports[index] = reportData;
        } else {
            userSub.reports.push(reportData);
        }
        
        userSub.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        res.json({ success: true, points: userSub.points });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Delete Report
app.delete('/api/report/:chatId/:id', async (req, res) => {
    try {
        const { chatId, id } = req.params;
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (data.subscriptions[chatIdStr] && data.subscriptions[chatIdStr].reports) {
            data.subscriptions[chatIdStr].reports = data.subscriptions[chatIdStr].reports.filter(r => r.id !== id);
            data.subscriptions[chatIdStr].updatedAt = new Date().toISOString();
            await saveLocalSubscriptions(data);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const appLogs = [];
function addLog(msg) {
    appLogs.push(`[${new Date().toISOString()}] ${msg}`);
    if (appLogs.length > 50) appLogs.shift();
    console.log(msg);
}

// 5. Send PDF via Telegram
app.post('/api/send-pdf', async (req, res) => {
    try {
        const { chatId, pdfBase64, filename, reportId } = req.body;
        addLog(`send-pdf called for chatId: ${chatId}, pdf length: ${pdfBase64 ? pdfBase64.length : 0}`);
        
        if (!chatId || !pdfBase64) {
            addLog('Missing chatId or pdfBase64');
            return res.status(400).json({ success: false, error: 'Missing chatId or pdf content' });
        }

        const pdfBuffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64');
        addLog(`Buffer created, size: ${pdfBuffer.length} bytes`);
        
        // Send document via Telegram Bot
        const message = await bot.sendDocument(chatId, pdfBuffer, {
            caption: '📄 تقرير الإجازة المرضية الخاص بك'
        }, {
            filename: filename || 'sickLeaves.pdf',
            contentType: 'application/pdf'
        });
        
        addLog(`Telegram sent doc successfully. fileId: ${message.document?.file_id}`);

        const fileId = message.document?.file_id;
        
        if (fileId && reportId) {
            const data = await loadLocalSubscriptions();
            const userSub = data.subscriptions[chatId.toString()];
            if (userSub && userSub.reports) {
                const report = userSub.reports.find(r => r.id === reportId);
                if (report) {
                    report.fileId = fileId;
                    userSub.updatedAt = new Date().toISOString();
                    await saveLocalSubscriptions(data);
                }
            }
            
            // Forward to channel for backup if channel ID is defined
            if (CHANNEL_ID) {
                try {
                    await bot.sendDocument(CHANNEL_ID, fileId);
                } catch (err) {
                    addLog('Could not forward to Telegram Channel: ' + err.message);
                }
            }
        }

        res.json({ success: true, fileId });
    } catch (err) {
        addLog(`Error sending PDF: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Generate Native PDF via Puppeteer
app.post('/api/generate-native-pdf', async (req, res) => {
    let browser = null;
    try {
        const { chatId, reportData, filename, reportId } = req.body;
        addLog(`generate-native-pdf called for chatId: ${chatId}`);
        
        if (!chatId || !reportData) {
            return res.status(400).json({ success: false, error: 'Missing chatId or reportData' });
        }
        
        // --- STRICT BLOCKING LOGIC ---
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        if (!data.subscriptions[chatIdStr]) {
            return res.status(403).json({ success: false, error: '⛔ غير مسجل. يرجى الاشتراك أولاً.' });
        }
        let userSub = data.subscriptions[chatIdStr];
        userSub = normalizeSubscription(userSub);
        
        if (userSub.status !== 'active') {
            let msg = '⛔ اشتراكك غير فعال.';
            if (userSub.status === 'expired') msg = '⛔ اشتراكك منتهي.';
            if (userSub.status === 'suspended') msg = '⛔ اشتراكك موقوف من قبل الإدارة.';
            return res.status(403).json({ success: false, error: msg });
        }

        let isUpdate = false;
        if (userSub.reports && reportId) {
            isUpdate = userSub.reports.some(r => r.id === reportId || r.id === reportData.id);
        }
        
        if (!isUpdate) {
            if (userSub.subscription_type === 'points') {
                if (userSub.balance_points < 5) {
                    return res.status(403).json({ success: false, error: '⛔ رصيد نقاطك غير كافٍ. تحتاج إلى 5 نقاط.' });
                }
            } else if (userSub.subscription_type === 'unlimited') {
                if (userSub.subscriptionDays <= 0) {
                    return res.status(403).json({ success: false, error: '⛔ اشتراكك غير المحدود انتهت مدته.' });
                }
            }
        }
        // -----------------------------


        // Helper: read local image as base64 data URI
        const imgToBase64 = async (filePath) => {
            try {
                const abs = path.join(__dirname, filePath);
                const buf = await fs.readFile(abs);
                const ext = path.extname(filePath).toLowerCase().replace('.', '');
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/png';
                return `data:${mime};base64,${buf.toString('base64')}`;
            } catch {
                return '';
            }
        };

        // Pre-load images as base64
        const sehaLogo = await imgToBase64('الشعارات/Seha.png');
        const ksaCalligraphy = await imgToBase64('الشعارات/ksa_calligraphy.png');
        const mohLogo = await imgToBase64('الشعارات/Saudi_Ministry_of_Health.JPG');
        const nhicLogo = await imgToBase64('الشعارات/dfhZfyJM_400x400 (1).jpg');

        const d = reportData;

        // Build self-contained HTML matching Sehaty platform exactly
        const html = `<!DOCTYPE html>
<html lang="ar" dir="ltr">
<head>
<meta charset="UTF-8">
</head>
<body>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { background: #fff !important; }
  body { margin: 0; padding: 0; background: #fff !important; width: 794px; height: 1123px; overflow: hidden; direction: ltr; }
  @page { size: 794px 1123px; margin: 0; }
  table { border-spacing: 0; direction: ltr; }
  td { font-family: 'Tajawal', 'Arial', sans-serif; }
  .label-en { border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 12px; width: 155px; text-align: center !important; vertical-align: middle !important; }
  .label-ar { border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 13px; width: 155px; text-align: center !important; vertical-align: middle !important; }
  .val { border: 1px solid #dee2e6; padding: 10px 8px; color: #1A365D; font-weight: normal; font-size: 12px; text-align: center !important; vertical-align: middle !important; }
  .dur-row td { background-color: #1F3864 !important; color: white; border: 1px solid #dee2e6; padding: 10px 8px; font-size: 12px; text-align: center !important; vertical-align: middle !important; }
  .dur-label { font-weight: bold; }
  tr:nth-child(even) td { background-color: #f8f9fa; }
</style>
<div style="width:794px;height:1123px;background:#fff;font-family:'Tajawal','Arial',sans-serif;position:relative;overflow:hidden;direction:ltr;">
  
  <!-- Header: Seha Logo (left) -->
  <img src="${sehaLogo}" style="position:absolute;top:-28px;left:15px;width:215px;">
  
  <!-- Header: KSA Calligraphy (center) -->
  <img src="${ksaCalligraphy}" style="position:absolute;top:0px;left:50%;transform:translateX(-50%);width:550px;height:210px;object-fit:contain;">
  
  <!-- Header: Kingdom text -->
  <div style="display:none; position:absolute;top:78px;left:0;width:794px;text-align:center;">
    <p style="font-family:'Times New Roman',serif;font-size:14px;color:#000;font-weight:bold;">Kingdom of Saudi Arabia</p>
  </div>
  
  <!-- Header: Arabic Title -->
  <div style="display:none; position:absolute;top:108px;left:0;width:794px;text-align:center;">
    <h1 style="color:#216ba5;font-size:22px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0;">${d.titleAr || 'تقرير إجازة مرضية'}</h1>
  </div>
  
  <!-- Header: English Title -->
  <div style="display:none; position:absolute;top:138px;left:0;width:794px;text-align:center;">
    <h2 style="color:#216ba5;font-size:14px;font-weight:bold;margin:0;">${d.titleEn || 'Sick Leave Report'}</h2>
  </div>
  
  <!-- Header: Geometric graphic (right) -->
  <svg width="280" height="150" viewBox="0 0 320 170" style="position:absolute;top:15px;right:0px;opacity:0.8;">
    <path d="M 30,40 L 55,60 M 30,40 L 65,50 M 55,60 L 65,50 M 55,60 L 70,100 M 65,50 L 70,100 M 70,100 L 85,35 M 70,100 L 105,70 M 70,100 L 100,110 M 85,35 L 105,70 M 85,35 L 150,30 M 105,70 L 100,110 M 105,70 L 150,30 M 105,70 L 195,60 M 105,70 L 170,80 M 150,30 L 195,60 M 150,30 L 190,40 M 100,110 L 170,80 M 170,80 L 195,60 M 170,80 L 240,90 M 190,40 L 195,60 M 190,40 L 240,90 M 195,60 L 240,90 M 240,90 L 250,40 M 240,90 L 255,85 M 240,90 L 280,130 M 250,40 L 255,85 M 255,85 L 290,30 M 280,130 L 290,30 M 280,130 L 300,160 M 290,30 L 300,160" stroke="#9cb1cd" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
    <circle cx="30" cy="40" r="2.5" fill="#9cb1cd"/>
    <circle cx="55" cy="60" r="2.5" fill="#9cb1cd"/>
    <circle cx="65" cy="50" r="2.5" fill="#9cb1cd"/>
    <circle cx="70" cy="100" r="2.5" fill="#9cb1cd"/>
    <circle cx="85" cy="35" r="2.5" fill="#9cb1cd"/>
    <circle cx="105" cy="70" r="2.5" fill="#9cb1cd"/>
    <circle cx="100" cy="110" r="2.5" fill="#9cb1cd"/>
    <circle cx="150" cy="30" r="2.5" fill="#9cb1cd"/>
    <circle cx="170" cy="80" r="2.5" fill="#9cb1cd"/>
    <circle cx="190" cy="40" r="2.5" fill="#9cb1cd"/>
    <circle cx="195" cy="60" r="2.5" fill="#9cb1cd"/>
    <circle cx="240" cy="90" r="2.5" fill="#9cb1cd"/>
    <circle cx="250" cy="40" r="2.5" fill="#9cb1cd"/>
    <circle cx="255" cy="85" r="2.5" fill="#9cb1cd"/>
    <circle cx="280" cy="130" r="2.5" fill="#9cb1cd"/>
    <circle cx="290" cy="30" r="2.5" fill="#9cb1cd"/>
    <circle cx="300" cy="160" r="2.5" fill="#9cb1cd"/>
  </svg>

  <!-- Horizontal separator line -->
  <div style="display:none; position:absolute;top:170px;left:40px;width:714px;height:1px;background:#dee2e6;"></div>

  <!-- Data Table -->
  <div style="position:absolute;top:230px;left:40px;width:714px;">
  <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;table-layout:fixed;">
    <tr>
      <td class="label-en" style="width:155px;">Leave ID</td>
      <td class="val" colspan="2" style="width:404px; font-family: 'Arial', sans-serif; white-space: nowrap;">${d.leaveId || ''}</td>
      <td class="label-ar" style="width:155px;">رمز الإجازة</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:155px;">Leave Duration</td>
      <td style="width:202px;">${d.durationEn || ''}</td>
      <td dir="rtl" style="width:202px;">${d.durationAr || ''}</td>
      <td class="dur-label" style="width:155px;">مدة الإجازة</td>
    </tr>
    <tr>
      <td class="label-en">Admission Date</td>
      <td class="val">${d.admissionG || ''}</td>
      <td class="val">${d.admissionH || ''}</td>
      <td class="label-ar">تاريخ الدخول</td>
    </tr>
    <tr>
      <td class="label-en">Discharge Date</td>
      <td class="val">${d.dischargeG || ''}</td>
      <td class="val">${d.dischargeH || ''}</td>
      <td class="label-ar">تاريخ الخروج</td>
    </tr>
    <tr>
      <td class="label-en">Issue Date</td>
      <td class="val" colspan="2">${d.issueDate || ''}</td>
      <td class="label-ar">تاريخ إصدار التقرير</td>
    </tr>
    <tr>
      <td class="label-en">${d.nameLabelEn || 'Name'}</td>
      <td class="val">${d.nameEn || ''}</td>
      <td class="val">${d.nameAr || ''}</td>
      <td class="label-ar">${d.nameLabelAr || 'الاسم'}</td>
    </tr>
    <tr>
      <td class="label-en">National ID / Iqama</td>
      <td class="val" colspan="2" style="font-family: 'Arial', sans-serif; white-space: nowrap;">${d.nationalId || ''}</td>
      <td class="label-ar">رقم الهوية/الاقامه</td>
    </tr>
    <tr>
      <td class="label-en">Nationality</td>
      <td class="val">${d.nationalityEn || 'Saudi Arabia'}</td>
      <td class="val">${d.nationalityAr || 'السعودية'}</td>
      <td class="label-ar">الجنسية</td>
    </tr>
    ${d.relationEn ? `<tr>
      <td class="label-en">Relation</td>
      <td class="val">${d.relationEn}</td>
      <td class="val">${d.relationAr || ''}</td>
      <td class="label-ar">صلة القرابة</td>
    </tr>` : ''}
    <tr>
      <td class="label-en">Employer</td>
      <td class="val">${d.employerEn || ''}</td>
      <td class="val">${d.employerAr || ''}</td>
      <td class="label-ar">جهة العمل</td>
    </tr>
    <tr>
      <td class="label-en">${d.docLabelEn || 'Practitioner Name'}</td>
      <td class="val">${d.doctorEn || ''}</td>
      <td class="val">${d.doctorAr || ''}</td>
      <td class="label-ar">${d.docLabelAr || 'اسم الممارس'}</td>
    </tr>
    <tr>
      <td class="label-en">Position</td>
      <td class="val">${d.positionEn || ''}</td>
      <td class="val">${d.positionAr || ''}</td>
      <td class="label-ar">المسمى الوظيفى</td>
    </tr>
  </table>

  <!-- ===== FOOTER ===== -->
  <div style="margin-top:10px;">
    
    <!-- Top Footer Row: QR/Text | Divider | MOH/Hospital -->
    <div style="display:flex; justify-content:center; align-items:flex-start; height:195px; margin-top: 0px;">
      
      <!-- Left: QR Code + Text -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; padding-top: 0px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=68x68&data=${encodeURIComponent(`https://www.seha.sa/#/inquiries/slenquiry?id=${d.leaveId}&nin=${d.nationalId}`)}" style="width:68px;height:68px;margin-top:20px;margin-bottom:45px;">
        <p style="font-size:10px;font-weight:bold;font-family:'Tajawal',sans-serif;text-align:center;margin:0 0 4px 0;line-height:1.4;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:8px;color:#333;text-align:center;margin:0 0 3px 0;font-style:italic; font-family: 'Arial', sans-serif;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;text-align:center;margin:0;"><a href="https://www.seha.sa/#/inquiries/slenquiry" style="color:#0000EE;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>
      </div>

      <!-- Center Vertical Divider -->
      <div style="width:1px; background-color:#cccccc; height:185px; margin-top: 5px;"></div>

      <!-- Right: MOH Logo + Hospital Name -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:25px; padding-top: 0px;">
        <img src="${d.hospitalLogoBase64 || mohLogo}" style="height:115px;object-fit:contain;margin-bottom:10px;">
        <h3 style="font-size:10.5px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">${d.hospitalAr || ''}</h3>
        <h4 style="font-size:9.5px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">${d.hospitalEn || ''}</h4>
        ${d.licenseNumber ? `<p style="font-size:13px;font-weight:bold;color:#000;margin:0;">رقم الترخيص : ${d.licenseNumber}</p>` : ''}
      </div>

    </div>

    <!-- Bottom Footer Row: Time/Date & NHIC Logo -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0; margin-top:10px; margin-bottom:-25px;">
      
      <!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 0px; margin-bottom: 0px; margin-left: 0px;">
        <p style="margin:0 0 10px 0;">${d.time || ''}</p>
        <p style="margin:0;">${d.dayDate || ''}</p>
      </div>

      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:0px; margin-bottom:0px; margin-right:0px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:11.5px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#00A99D; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Arial',sans-serif; color:#1A365D; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>
      
    </div>
    
  </div>

  </div>
</div>
</body>
</html>`;

        
        addLog('Launching puppeteer...');
        const browser = await puppeteer.launch({
            headless: 'new',
            timeout: 90000,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load', timeout: 90000 });
        
        addLog('Generating PDF via Puppeteer...');
        const pdfResult = await page.pdf({
            printBackground: true,
            width: '794px',
            height: '1123px',
            pageRanges: '1'
        });
        await browser.close();
        
        // CRITICAL FIX: Puppeteer > v22 returns a Uint8Array instead of a Buffer.
        // node-telegram-bot-api (via request/form-data) attempts to deeply stringify Uint8Array
        // treating it as a standard object, causing 'Maximum call stack size exceeded' and crashing Node!
        // We MUST convert it back to a standard Node Buffer.
        const pdfBuffer = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult);

        addLog('Sending PDF to Telegram...');
        const message = await bot.sendDocument(chatId, pdfBuffer, {
            caption: '📄 تقرير الإجازة المرضية الخاص بك'
        }, {
            filename: filename || 'sickLeaves.pdf',
            contentType: 'application/pdf'
        });
        
        res.json({ success: true, fileId: message.document.file_id, reportId: reportId });

    } catch (err) {
        addLog(`Error generating HTML for PDF: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6.5 Send Client-Generated PDF
app.post('/api/send-generated-pdf', async (req, res) => {
    try {
        const { chatId, pdfBase64, filename, reportId } = req.body;
        if (!chatId || !pdfBase64) return res.status(400).json({ error: 'Missing data' });
        
        const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',').pop() : pdfBase64;
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        
        const message = await bot.sendDocument(chatId, pdfBuffer, {
            caption: '📄 تقرير الإجازة المرضية الخاص بك'
        }, {
            filename: filename || 'sickLeaves.pdf',
            contentType: 'application/pdf'
        });
        
        addLog(`Telegram sent generated doc successfully. fileId: ${message.document?.file_id}`);
        const fileId = message.document?.file_id;
        
        if (fileId && reportId) {
            const data = await loadLocalSubscriptions();
            const userSub = data.subscriptions[chatId.toString()];
            if (userSub && userSub.reports) {
                const report = userSub.reports.find(r => r.id === reportId);
                if (report) {
                    report.fileId = fileId;
                    userSub.updatedAt = new Date().toISOString();
                    await saveLocalSubscriptions(data);
                }
            }
            
            if (typeof CHANNEL_ID !== 'undefined' && CHANNEL_ID) {
                try {
                    await bot.sendDocument(CHANNEL_ID, fileId);
                } catch (err) {
                    addLog('Could not forward to Telegram Channel: ' + err.message);
                }
            }
        }
        
        res.json({ success: true, fileId });
    } catch (err) {
        console.error('Error sending generated PDF:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/logs', (req, res) => {
    if (req.query.msg) {
        addLog(`CLIENT LOG: ${req.query.msg}`);
    }
    res.json(appLogs);
});


// 6. Send Existing PDF via file_id
app.post('/api/send-existing-pdf', async (req, res) => {
    try {
        const { chatId, reportId } = req.body;
        const data = await loadLocalSubscriptions();
        const userSub = data.subscriptions[chatId.toString()];
        if (!userSub || !userSub.reports) {
            return res.status(404).json({ success: false, error: 'User or reports not found' });
        }
        
        const report = userSub.reports.find(r => r.id === reportId);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }
        
        if (!report.fileId) {
            return res.status(400).json({ success: false, error: 'No PDF generated for this report yet.' });
        }
        
        await bot.sendDocument(chatId, report.fileId);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending existing PDF:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. Public Verify Endpoint
app.get('/api/verify', async (req, res) => {
    try {
        const { id, nid } = req.query;
        const data = await loadLocalSubscriptions();
        
        let foundReport = null;
        for (const user of Object.values(data.subscriptions)) {
            if (user.reports) {
                const report = user.reports.find(r => r.id === id && r.nationalId === nid);
                if (report) {
                    foundReport = report;
                    break;
                }
            }
        }
        
        if (foundReport) {
            res.json({ success: true, report: foundReport });
        } else {
            res.json({ success: false, error: 'Not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Ensure SPA routes always return index.html instead of Not Found
app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith(`/webhook/${TOKEN}`)) {
        return res.status(404).json({ success: false, error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Set Telegram Chat Menu Button (Open button)
const configureChatMenuButton = async (targetChatId = null) => {
    try {
        const https = require('https');
        const sendReq = (chatIdVal = null) => {
            const bodyObj = {
                menu_button: {
                    type: 'web_app',
                    text: 'Open', web_app: { url: WEB_APP_URL_CACHED }
                }
            };
            if (chatIdVal) {
                bodyObj.chat_id = chatIdVal.toString();
            }
            const payload = JSON.stringify(bodyObj);

            return new Promise((resolve) => {
                const req = https.request({
                    hostname: 'api.telegram.org',
                    path: `/bot${TOKEN}/setChatMenuButton`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.ok) {
                                console.log(`✓ Bot Menu Button "Open" set to: ${WEB_APP_URL}${chatIdVal ? ' for chat ' + chatIdVal : ' (default)'}`);
                            }
                        } catch (e) {}
                        resolve();
                    });
                });
                req.on('error', resolve);
                req.write(payload);
                req.end();
            });
        };

        if (targetChatId) {
            await sendReq(targetChatId);
        }
        await sendReq(null);
    } catch (e) {
        console.warn('Could not set ChatMenuButton:', e.message);
    }
};

// Start Server
const startServer = async () => {
    try {
        // Initialize subscriptions.json if missing
        try {
            await fs.access(subscriptionsPath);
        } catch (e) {
            await fs.writeFile(subscriptionsPath, JSON.stringify({ subscriptions: {} }, null, 2), 'utf-8');
            console.log('✓ Created local subscriptions.json database');
        }

        // Configure Webhook if in Production (Render)
        if (isProduction) {
            const webhookUrl = `${WEB_APP_URL}/webhook/${TOKEN}`;
            await bot.setWebHook(webhookUrl);
            console.log(`✓ Webhook set to: ${webhookUrl}`);
            
            app.post(`/webhook/${TOKEN}`, (req, res) => {
                bot.processUpdate(req.body);
                res.sendStatus(200);
            });
        }

        // Configure Open button with the correct Render URL
        await configureChatMenuButton();

        
        // Ensure Puppeteer Chrome is installed on Render
        try {
            console.log('Checking and installing Puppeteer Chrome if missing...');
            const { execSync } = require('child_process');
            execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
            console.log('Chrome installation verified.');
        } catch (err) {
            console.error('Failed to ensure Chrome:', err.message);
        }

        app.listen(PORT, () => {
            console.log(`\n=== SEHA Sick Leave App ===`);
            console.log(`✓ Server running at http://localhost:${PORT}`);
            console.log(`✓ WEB_APP_URL = ${WEB_APP_URL}`);
            console.log(`✓ Bot mode: ${isProduction ? 'Webhook (Production/Render)' : 'Polling (Local)'}`);
            console.log(`✓ Database: Local subscriptions.json\n`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Manual setup endpoint - visit /setup to re-configure webhook & menu button (admin use)
app.get('/setup', async (req, res) => {
    try {
        await configureChatMenuButton();
        if (isProduction) {
            const webhookUrl = `${WEB_APP_URL}/webhook/${TOKEN}`;
            await bot.setWebHook(webhookUrl);
            res.json({
                success: true,
                message: `Webhook and Menu Button configured successfully`,
                webhookUrl,
                webAppUrl: WEB_APP_URL_CACHED
            });
        } else {
            res.json({
                success: true,
                message: 'Menu Button configured (local polling mode)',
                webAppUrl: WEB_APP_URL_CACHED
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

startServer();


// Auto-grant 1-year sub to Zakaria_2025
(async () => {
    try {
        const data = await loadLocalSubscriptions();
        const adminId = 'pending_zakaria_2025';
        let hasSub = false;
        for (const sub of Object.values(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === 'zakaria_2025' && sub.subscriptionDays > 300) {
                hasSub = true;
                break;
            }
        }
        if (!hasSub) {
            await addSubscriptionByUsername('Zakaria_2025', 365);
            console.log('Granted 1-year to Zakaria_2025');
        }
    } catch(e) {}
})();
