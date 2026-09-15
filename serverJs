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
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8747259082:AAEOGk2J3Rc_-ry7HHH2nTthvJR_ysJNaQk';
const PORT = process.env.PORT || 3000;
const WEB_APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.WEB_APP_URL || 'https://seha-sickleave.onrender.com';
const WEB_APP_URL_CACHED = WEB_APP_URL + '?v=47';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Zakaria_2025';
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
            delete data.subscriptions[foundChatId];
            data.subscriptions[chatIdStr] = userSub;
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
            await bot.sendMessage(result.chatId, `🎉 تم تفعيل اشتراكك لمدة ${days} يوم من قبل المسؤول! يمكنك الآن فتح التطبيق عبر /start.`);
        } catch (e) {
            console.warn('Could not send notification to user:', e.message);
        }
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

// API Endpoints

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
        const { leaveId, nationalId } = req.body;
        const data = await loadLocalSubscriptions();
        
        let foundReport = null;
        for (const chatId in data.subscriptions) {
            const sub = data.subscriptions[chatId];
            if (sub.reports) {
                const report = sub.reports.find(r => r.id === leaveId && r.data.national_id === nationalId);
                if (report) {
                    foundReport = report;
                    break;
                }
            }
        }

        if (foundReport) {
            res.json({ success: true, report: foundReport });
        } else {
            res.json({ success: false, error: 'التقرير غير موجود أو البيانات غير متطابقة' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
  .val { border: 1px solid #dee2e6; padding: 10px 8px; color: #1A365D; font-weight: bold; font-size: 12px; text-align: center !important; vertical-align: middle !important; }
  .dur-row td { background-color: #1F3864 !important; color: white; border: 1px solid #dee2e6; padding: 10px 8px; font-size: 12px; text-align: center !important; vertical-align: middle !important; }
  .dur-label { font-weight: bold; }
  tr:nth-child(even) td { background-color: #f8f9fa; }
</style>
<div style="width:794px;height:1123px;background:#fff;font-family:'Tajawal','Arial',sans-serif;position:relative;overflow:hidden;direction:ltr;">
  
  <!-- Header: Seha Logo (left) -->
  <img src="${sehaLogo}" style="position:absolute;top:-5px;left:15px;width:175px;">
  
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
  <svg width="180" height="120" viewBox="0 0 200 120" style="position:absolute;top:15px;right:0px;opacity:0.5;">
    <path d="M 20,40 L 50,70 L 90,20 L 140,50 L 190,10 M 50,70 L 80,100 L 120,60 L 170,110 L 190,10 M 90,20 L 120,60 L 140,50 M 20,40 L 40,10 L 90,20 M 120,60 L 150,20 L 190,10 M 80,100 L 90,20" stroke="#7ca9c9" stroke-width="1.0" fill="none"/>
  </svg>

  <!-- Horizontal separator line -->
  <div style="display:none; position:absolute;top:170px;left:40px;width:714px;height:1px;background:#dee2e6;"></div>

  <!-- Data Table -->
  <div style="position:absolute;top:230px;left:40px;width:714px;">
  <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;table-layout:fixed;">
    <tr>
      <td class="label-en" style="width:155px;">Leave ID</td>
      <td class="val" colspan="2" style="width:404px;">${d.leaveId || ''}</td>
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
      <td class="val" colspan="2">${d.nationalId || ''}</td>
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
    <div style="display:flex; justify-content:center; align-items:flex-start; height:180px; margin-top: 0px;">
      
      <!-- Left: QR Code + Text -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px; margin-top: 10px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=75x75&data=${encodeURIComponent("https://www.seha.sa/#/inquiries/slenquiry")}" style="width:75px;height:75px;margin-bottom:12px;">
        <p style="font-size:10px;font-weight:bold;font-family:'Tajawal',sans-serif;text-align:center;margin:0 0 4px 0;line-height:1.4;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:8px;color:#333;text-align:center;margin:0 0 3px 0;font-style:italic; font-family: 'Arial', sans-serif;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;text-align:center;margin:0;"><a href="https://www.seha.sa/#/inquiries/slenquiry" style="color:#0000EE;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>
      </div>

      <!-- Center Vertical Divider -->
      <div style="width:1px; background-color:#cccccc; height:150px; margin-top: 5px;"></div>

      <!-- Right: MOH Logo + Hospital Name -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:15px; padding-top: 0px;">
        <img src="${d.hospitalLogoBase64 || mohLogo}" style="height:115px;object-fit:contain;margin-bottom:10px;">
        <h3 style="font-size:13px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">${d.hospitalAr || ''}</h3>
        <h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">${d.hospitalEn || ''}</h4>
        ${d.licenseNumber ? `<p style="font-size:13px;font-weight:bold;color:#000;margin:0;">رقم الترخيص : ${d.licenseNumber}</p>` : ''}
      </div>

    </div>

    <!-- Bottom Footer Row: Time/Date & NHIC Logo -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0 40px; margin-top:10px;">
      
      <!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000; padding-bottom: 25px;">
        <p style="margin:0 0 10px 0;">${d.time || ''}</p>
        <p style="margin:0;">${d.dayDate || ''}</p>
      </div>

      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center; padding-bottom:10px; margin-right:-18px;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:12.5px; font-weight:bold; font-family:'Tajawal',sans-serif; color:#00A99D; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
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
