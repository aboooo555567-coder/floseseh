const express = require('express');
const cors = require('cors');
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '***REDACTED-BOT-TOKEN***';
const PORT = process.env.PORT || 3000;
const WEB_APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.WEB_APP_URL || 'https://seha-sickleave.onrender.com';
const WEB_APP_URL_CACHED = WEB_APP_URL + '?v=7';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'zakmmm_1211';
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
const isProduction = Boolean(WEB_APP_URL) && WEB_APP_URL.startsWith('https://') && !WEB_APP_URL.includes('localhost');
const bot = new TelegramBot(TOKEN, { polling: !isProduction });

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

    await bot.sendMessage(chatId, statusMsg, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏥 فتح التطبيق (إنشاء تقرير)', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: '🛒 متجر الباقات', callback_data: 'packages' }, { text: '🔗 برنامج الإحالات', callback_data: 'referrals' }]
            ]
        }
    });
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
    await bot.sendMessage(chatId, `⚡ تم تفعيل قائمة الوصول السريع! يمكنك فتح التطبيق فوراً بالضغط على الزر الأزرق أدناه 👇`, {
        reply_markup: {
            keyboard: [
                [{ text: '📱 فتح واجهات الإدخال (التطبيق) 🚀', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: '🔗 كسب نقاط (الإحالات)' }, { text: '🛒 متجر الباقات' }],
                [{ text: '📊 حالة حسابي' }]
            ],
            resize_keyboard: true
        }
    });

    // Message 2: Dynamic status welcome message with full inline keyboard & direct links
    const daysLeft = user.subscriptionDays || 0;
    const statusIcon = daysLeft > 0 ? '✅' : '❌';
    const statusText = daysLeft > 0 ? `فعال - متبقي ${daysLeft} يوم` : `غير فعال - متبقي 0 يوم`;
    
    const welcomeText = `👋 أهلاً بعودتك ${displayName}!

${statusIcon} اشتراكك ${statusText}
🌑 رصيدك الحالي من النقاط: ${user.points || 0} نقطة
• تكلفة التقرير الواحد: 5 نقاط.

💡 يمكنك فتح التطبيق وواجهات الإدخال مباشرة بالضغط على الأزرار التفاعلية أدناه:
🌐 رابط المباشر: ${WEB_APP_URL}`;

    await bot.sendMessage(chatId, welcomeText, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏥 فتح التطبيق مباشرة (إنشاء تقرير)', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: 'إصدار تقرير 📄', web_app: { url: WEB_APP_URL_CACHED } }],
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

// /admin command
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    if (!username || username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
        await bot.sendMessage(chatId, 'ليس لديك صلاحية المسؤول.');
        return;
    }
    await bot.sendMessage(chatId, `أوامر المسؤول:
/addsub @username <days> - تفعيل أو تمديد اشتراك للمستخدم
/mysub - عرض حالة الاشتراك الخاصة بك`);
});

// Admin commands to add subscriptions
bot.onText(/\/addsub\s+@?(\w+)\s+(\d+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    
    if (!username || username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
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
    
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'مستخدم';
    
    if (msg.text === '📊 حالة حسابي') {
        const user = await findSubscription(chatId, username);
        const daysLeft = user.subscriptionDays || 0;
        const statusText = daysLeft > 0 ? 'فعال' : 'غير فعال';
        const subStatusIcon = daysLeft > 0 ? '✅' : '❌';

        const statusMsg = `👤 حالة حسابك:

${subStatusIcon} الاشتراك الشهري: ${statusText}
متبقي: ${daysLeft} يوم

🌑 رصيد النقاط: ${user.points || 0} نقطة
• تكلفة التقرير الواحد: 5 نقاط

💡 يمكنك استخدام النقاط لإنشاء التقارير بدون اشتراك شهري. لتفعيل الاشتراك غير محدود مع كود خصم يرجى التواصل مع المالك.`;

        await bot.sendMessage(chatId, statusMsg);
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

    await bot.sendMessage(chatId, referralMsg);
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
        if (!chatId || !report) {
            return res.status(400).json({ success: false, error: 'chatId and report are required' });
        }

        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        const userSub = data.subscriptions[chatIdStr];

        if (!userSub) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const normalized = normalizeSubscription(userSub);
        if (normalized.subscriptionDays <= 0) {
            return res.status(403).json({ success: false, error: 'Subscription required' });
        }

        if (!userSub.reports) {
            userSub.reports = [];
        }

        const index = userSub.reports.findIndex(r => r.id === report.id);
        if (index >= 0) {
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

// 2. Buy Package (Update User Subscription)
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
        
        if (normalized.subscriptionDays <= 0) {
            return res.status(403).json({ success: false, error: 'Subscription required' });
        }
        
        if (!userSub.reports) {
            userSub.reports = [];
        }
        
        const index = userSub.reports.findIndex(r => r.id === reportData.id);
        if (index >= 0) {
            userSub.reports[index] = reportData;
        } else {
            userSub.reports.push(reportData);
        }
        
        userSub.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        res.json({ success: true });
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
            caption: 'تقرير الإجازة المرضية الخاص بك 📄'
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
                    text: 'Open',
                    web_app: { url: WEB_APP_URL_CACHED }
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
