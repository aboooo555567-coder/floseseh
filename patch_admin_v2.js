const fs = require('fs');

function run() {
    let code = fs.readFileSync('server.js', 'utf8');

    // 1. Remove old admin commands
    const patternsToRemove = [
        /bot\.onText\(\/\\\/admin\/.*?\}\);\n/gs,
        /bot\.onText\(\/\\\/addsub.*?\}\);\n/gs,
        /bot\.onText\(\/\\\/addpoints.*?\}\);\n/gs,
        /bot\.onText\(\/\\\/cancelsub.*?\}\);\n/gs,
        /bot\.onText\(\/\\\/removepoints.*?\}\);\n/gs,
        /bot\.onText\(\/\\\/subscribers.*?\}\);\n/gs,
    ];

    patternsToRemove.forEach(pattern => {
        code = code.replace(pattern, '');
    });
    
    code = code.replace(/let currentAdminToken = null;\n/, '');

    if (!code.includes('ADMIN_CHAT_ID')) {
        code = code.replace(
            /const ADMIN_USERNAME = process\.env\.ADMIN_USERNAME \|\| 'Zakaria_2025';/,
            "const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Zakaria_2025';\nconst ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '1211116248';"
        );
    }
    
    const newNormalize = `// Normalize subscriber object
const normalizeSubscription = (user) => {
    if (!user) return null;
    const now = new Date();
    
    // Migration
    if (!user.subscription_type) {
        user.subscription_type = 'points';
        user.status = 'active';
        user.subscription_start_date = user.updatedAt || now.toISOString();
        if (user.subscriptionExpires) {
            user.subscription_end_date = user.subscriptionExpires;
        } else if (user.subscriptionDays > 0) {
            user.subscription_end_date = new Date(now.getTime() + user.subscriptionDays * 24 * 60 * 60 * 1000).toISOString();
        } else {
            user.subscription_end_date = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
        }
        if (!user.transactions) user.transactions = [];
        if (user.balance_points === undefined) user.balance_points = user.points || 0;
    }

    // Calculate days
    if (user.subscription_end_date) {
        const expires = new Date(user.subscription_end_date);
        const diffMs = expires - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        user.subscriptionDays = diffDays > 0 ? diffDays : 0;
        
        const start = new Date(user.subscription_start_date);
        const totalMs = now - start;
        const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
        user.daysUsed = totalDays > 0 ? totalDays : 0;
        
        // Auto expire
        if (diffMs <= 0 && user.status === 'active') {
            user.status = 'expired';
        }
    } else {
        user.subscriptionDays = 0;
        user.daysUsed = 0;
    }
    
    return user;
};`;
    code = code.replace(/\/\/ Normalize subscriber object.*?return user;\n\};/s, newNormalize);

    const pdfBlockRegex = /\/\/ --- STRICT BLOCKING LOGIC ---.*?\/\/ -----------------------------/s;
    const newPdfBlock = `// --- STRICT BLOCKING LOGIC ---
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
        // -----------------------------`;
    code = code.replace(pdfBlockRegex, newPdfBlock);
    
    const deductionRegex = /if \(!isUpdate\) \{\s+userSub\.reports\.push\(\{[\s\S]*?\}\);\s+if \(userSub\.points > 0\).*?\s+\}/s;
    const newDeduction = `if (!isUpdate) {
                userSub.reports.push({
                    id: reportId || reportData.id,
                    type: leaveTypeValue,
                    date: new Date().toISOString()
                });
                if (userSub.subscription_type === 'points') {
                    const before = userSub.balance_points;
                    userSub.balance_points -= 5;
                    userSub.points = userSub.balance_points;
                    if (!userSub.transactions) userSub.transactions = [];
                    userSub.transactions.push({
                        id: 'txn_' + Date.now(),
                        chat_id: chatIdStr,
                        type: 'points_deduct',
                        amount: -5,
                        balance_before: before,
                        balance_after: userSub.balance_points,
                        reason: 'إنشاء تقرير ' + (reportId || reportData.id),
                        performed_by: 'system',
                        created_at: new Date().toISOString()
                    });
                }
            }`;
    code = code.replace(deductionRegex, newDeduction);


    const adminLogicLines = [
        "// ==========================================",
        "// TELEGRAM ADMIN PANEL",
        "// ==========================================",
        "const adminState = {};",
        "const isAdmin = (cid) => cid.toString() === ADMIN_CHAT_ID;",
        "",
        "bot.onText(/\\/admin/, async (msg) => {",
        "    const chatId = msg.chat.id.toString();",
        "    if (!isAdmin(chatId)) {",
        "        await bot.sendMessage(chatId, '⛔ ليس لديك صلاحية للوصول إلى لوحة المشرف.');",
        "        return;",
        "    }",
        "    await showAdminPanel(chatId);",
        "});",
        "",
        "async function showAdminPanel(chatId, messageId = null) {",
        "    const data = await loadLocalSubscriptions();",
        "    const subs = Object.values(data.subscriptions).map(normalizeSubscription);",
        "    const total = subs.length;",
        "    const active = subs.filter(s => s.status === 'active').length;",
        "    const suspended = subs.filter(s => s.status === 'suspended').length;",
        "    const expired = subs.filter(s => s.status === 'expired').length;",
        "    ",
        "    let totalReports = 0;",
        "    let totalPoints = 0;",
        "    subs.forEach(s => {",
        "        totalReports += (s.reports ? s.reports.length : 0);",
        "        if (s.subscription_type === 'points') totalPoints += (s.balance_points || 0);",
        "    });",
        "",
        "    const text = '🔐 *لوحة تحكم المشرف*\\n\\n' +",
        "        '👥 المشتركين: ' + total + '\\n' +",
        "        '🟢 الفعالون: ' + active + '\\n' +",
        "        '🔴 الموقوفون: ' + suspended + '\\n' +",
        "        '⚠️ المنتهية: ' + expired + '\\n' +",
        "        '📄 إجمالي التقارير: ' + totalReports + '\\n' +",
        "        '⭐ إجمالي النقاط: ' + totalPoints;",
        "",
        "    const opts = {",
        "        parse_mode: 'Markdown',",
        "        reply_markup: {",
        "            inline_keyboard: [",
        "                [{ text: '👥 إدارة المشتركين', callback_data: 'admin_users' }],",
        "                [{ text: '➕ إضافة مشترك', callback_data: 'admin_add_user' }],",
        "                [{ text: '🔎 البحث عن مشترك', callback_data: 'admin_search' }],",
        "                [{ text: '📊 الإحصائيات', callback_data: 'admin_stats' }],",
        "                [{ text: '📋 سجل العمليات', callback_data: 'admin_logs_all_0' }],",
        "                [{ text: '🔄 تحديث', callback_data: 'admin_refresh' }]",
        "            ]",
        "        }",
        "    };",
        "",
        "    if (messageId) {",
        "        try {",
        "            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...opts });",
        "        } catch (e) { /* ignore if not modified */ }",
        "    } else {",
        "        await bot.sendMessage(chatId, text, opts);",
        "    }",
        "}",
        "",
        "bot.on('callback_query', async (query) => {",
        "    const chatId = query.message.chat.id.toString();",
        "    const data = query.data;",
        "",
        "    if (data.startsWith('admin_')) {",
        "        if (!isAdmin(chatId)) {",
        "            await bot.answerCallbackQuery(query.id, { text: '⛔ ليس لديك صلاحية.', show_alert: true });",
        "            return;",
        "        }",
        "",
        "        if (data === 'admin_main' || data === 'admin_refresh') {",
        "            await showAdminPanel(chatId, query.message.message_id);",
        "            await bot.answerCallbackQuery(query.id);",
        "            return;",
        "        }",
        "",
        "        if (data === 'admin_users') {",
        "            const opts = {",
        "                reply_markup: {",
        "                    inline_keyboard: [",
        "                        [{ text: '🔎 البحث بـ Chat ID', callback_data: 'admin_search' }],",
        "                        [{ text: '➕ إضافة مشترك', callback_data: 'admin_add_user' }],",
        "                        [{ text: '📋 جميع المشتركين', callback_data: 'admin_users_list_0' }],",
        "                        [{ text: '🔙 رجوع', callback_data: 'admin_main' }]",
        "                    ]",
        "                }",
        "            };",
        "            await bot.editMessageText('👥 *إدارة المشتركين*', { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', ...opts });",
        "            await bot.answerCallbackQuery(query.id);",
        "            return;",
        "        }",
        "",
        "        if (data.startsWith('admin_users_list_')) {",
        "            const page = parseInt(data.split('_').pop());",
        "            const db = await loadLocalSubscriptions();",
        "            const subs = Object.entries(db.subscriptions).map(([cid, s]) => ({cid, ...normalizeSubscription(s)})).filter(s => !s.cid.startsWith('pending_'));",
        "            ",
        "            const perPage = 5;",
        "            const totalPages = Math.ceil(subs.length / perPage) || 1;",
        "            const start = page * perPage;",
        "            const pagedSubs = subs.slice(start, start + perPage);",
        "",
        "            let text = '📋 *جميع المشتركين* (صفحة ' + (page + 1) + '/' + totalPages + ')\\n\\n';",
        "            const keyboard = [];",
        "",
        "            pagedSubs.forEach(s => {",
        "                const icon = s.status === 'active' ? '🟢' : (s.status === 'suspended' ? '🔴' : '⚠️');",
        "                const typeIcon = s.subscription_type === 'points' ? '⭐' : '♾️';",
        "                const reports = s.reports ? s.reports.length : 0;",
        "                const balance = s.subscription_type === 'points' ? (' - ' + s.balance_points + ' نقطة') : '';",
        "                text += icon + ' [' + s.cid + '] ' + (s.username ? '@'+s.username : '') + '\\n' +",
        "                        typeIcon + ' ' + (s.subscription_type === 'points' ? 'نقاط' : 'غير محدود') + balance + ' - 📄 ' + reports + ' تقرير\\n\\n';",
        "                keyboard.push([{ text: '👤 إدارة ' + s.cid, callback_data: 'admin_user_' + s.cid }]);",
        "            });",
        "",
        "            const navRow = [];",
        "            if (page > 0) navRow.push({ text: '◀️ السابق', callback_data: 'admin_users_list_' + (page - 1) });",
        "            if (page < totalPages - 1) navRow.push({ text: 'التالي ▶️', callback_data: 'admin_users_list_' + (page + 1) });",
        "            if (navRow.length > 0) keyboard.push(navRow);",
        "            keyboard.push([{ text: '🔙 رجوع', callback_data: 'admin_users' }]);",
        "",
        "            await bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });",
        "            await bot.answerCallbackQuery(query.id);",
        "            return;",
        "        }",
        "",
        "        if (data === 'admin_search' || data === 'admin_add_user') {",
        "            adminState[chatId] = { step: data === 'admin_search' ? 'SEARCH_CHAT_ID' : 'ADD_USER_CHAT_ID' };",
        "            await bot.sendMessage(chatId, data === 'admin_search' ? 'أرسل Chat ID الخاص بالمشترك للبحث:' : 'أرسل Chat ID للمشترك الجديد:', { reply_markup: { inline_keyboard: [[{ text: 'إلغاء', callback_data: 'admin_main' }]] } });",
        "            await bot.answerCallbackQuery(query.id);",
        "            return;",
        "        }",
        "",
        "        if (data.startsWith('admin_user_')) {",
        "            const parts = data.split('_');",
        "            if (parts.length === 3) {",
        "                const targetId = parts[2];",
        "                await showUserPanel(chatId, targetId, query.message.message_id);",
        "            } else {",
        "                const action = parts[2];",
        "                const targetId = parts[3];",
        "                const db = await loadLocalSubscriptions();",
        "                const sub = db.subscriptions[targetId];",
        "                ",
        "                if (!sub) {",
        "                    await bot.answerCallbackQuery(query.id, { text: 'غير موجود!', show_alert: true });",
        "                    return;",
        "                }",
        "",
        "                if (action === 'toggle') {",
        "                    sub.status = sub.status === 'active' ? 'suspended' : 'active';",
        "                    logTransaction(sub, targetId, 'status_change', 0, 'تغيير الحالة إلى ' + sub.status, 'admin');",
        "                    await saveLocalSubscriptions(db);",
        "                    await showUserPanel(chatId, targetId, query.message.message_id);",
        "                } else if (action === 'cancel') {",
        "                    sub.status = 'expired';",
        "                    sub.subscription_end_date = new Date().toISOString();",
        "                    logTransaction(sub, targetId, 'status_change', 0, 'إلغاء الاشتراك', 'admin');",
        "                    await saveLocalSubscriptions(db);",
        "                    await showUserPanel(chatId, targetId, query.message.message_id);",
        "                } else if (action === 'addpoints' || action === 'removepoints' || action === 'changetype') {",
        "                    adminState[chatId] = { step: action.toUpperCase(), targetId, msgId: query.message.message_id };",
        "                    let prompt = '';",
        "                    if (action === 'addpoints') prompt = 'كم عدد النقاط التي تريد إضافتها؟';",
        "                    if (action === 'removepoints') prompt = 'كم عدد النقاط التي تريد خصمها؟';",
        "                    if (action === 'changetype') prompt = 'أرسل النوع الجديد: points أو unlimited\\nإذا كان نقاط، أرسل: points,1000,30 (النوع،الرصيد،الأيام)\\nإذا كان غير محدود: unlimited,30 (النوع،الأيام)';",
        "                    ",
        "                    await bot.sendMessage(chatId, prompt, { reply_markup: { inline_keyboard: [[{ text: 'إلغاء', callback_data: 'admin_user_' + targetId }]] } });",
        "                } else if (action === 'logs') {",
        "                    const page = parseInt(parts[4] || 0);",
        "                    await showUserLogs(chatId, targetId, page, query.message.message_id);",
        "                }",
        "            }",
        "            await bot.answerCallbackQuery(query.id);",
        "            return;",
        "        }",
        "",
        "    }",
        "});",
        "",
        "function logTransaction(sub, cid, type, amount, reason, by) {",
        "    if (!sub.transactions) sub.transactions = [];",
        "    sub.transactions.push({",
        "        id: 'txn_' + Date.now() + Math.floor(Math.random()*1000),",
        "        chat_id: cid,",
        "        type,",
        "        amount,",
        "        balance_before: sub.balance_points || 0,",
        "        balance_after: (sub.balance_points || 0) + (type==='points_remove'? -amount : amount),",
        "        reason,",
        "        performed_by: by,",
        "        created_at: new Date().toISOString()",
        "    });",
        "}",
        "",
        "async function showUserLogs(chatId, targetId, page, messageId) {",
        "    const db = await loadLocalSubscriptions();",
        "    const sub = normalizeSubscription(db.subscriptions[targetId]);",
        "    if (!sub) return;",
        "    ",
        "    const txns = [...(sub.transactions || [])].reverse();",
        "    const perPage = 5;",
        "    const totalPages = Math.ceil(txns.length / perPage) || 1;",
        "    const paged = txns.slice(page * perPage, page * perPage + perPage);",
        "    ",
        "    let text = '📋 *سجل عمليات* ' + targetId + '\\n\\n';",
        "    paged.forEach(t => {",
        "        text += '📅 ' + new Date(t.created_at).toLocaleString() + '\\n' +",
        "                'العملية: ' + t.reason + '\\n' +",
        "                'المبلغ: ' + t.amount + '\\n' +",
        "                'الرصيد: ' + t.balance_before + ' -> ' + t.balance_after + '\\n' +",
        "                'بواسطة: ' + t.performed_by + '\\n\\n';",
        "    });",
        "    if(txns.length === 0) text += 'لا توجد عمليات.';",
        "",
        "    const navRow = [];",
        "    if (page > 0) navRow.push({ text: '◀️ السابق', callback_data: 'admin_user_logs_' + targetId + '_' + (page - 1) });",
        "    if (page < totalPages - 1) navRow.push({ text: 'التالي ▶️', callback_data: 'admin_user_logs_' + targetId + '_' + (page + 1) });",
        "    ",
        "    const keyboard = [];",
        "    if (navRow.length > 0) keyboard.push(navRow);",
        "    keyboard.push([{ text: '🔙 رجوع للمشترك', callback_data: 'admin_user_' + targetId }]);",
        "",
        "    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });",
        "}",
        "",
        "async function showUserPanel(chatId, targetId, messageId) {",
        "    const db = await loadLocalSubscriptions();",
        "    const sub = normalizeSubscription(db.subscriptions[targetId]);",
        "    if (!sub) {",
        "        const kb = { inline_keyboard: [[{ text: 'رجوع', callback_data: 'admin_main'}]] };",
        "        if (messageId) {",
        "            await bot.editMessageText('⛔ المشترك غير موجود.', { chat_id: chatId, message_id: messageId, reply_markup: kb });",
        "        } else {",
        "            await bot.sendMessage(chatId, '⛔ المشترك غير موجود.', { reply_markup: kb });",
        "        }",
        "        return;",
        "    }",
        "",
        "    const icon = sub.status === 'active' ? '🟢 فعال' : (sub.status === 'suspended' ? '🔴 موقوف' : '⚠️ منتهي');",
        "    const type = sub.subscription_type === 'points' ? '⭐ بالنقاط' : '♾️ غير محدود';",
        "    const repCount = sub.reports ? sub.reports.length : 0;",
        "    const daysLeft = sub.subscriptionDays;",
        "    ",
        "    const text = '👤 *بيانات المشترك*\\n' +",
        "                 'Chat ID: `' + targetId + '`\\n' +",
        "                 'Username: ' + (sub.username ? '@'+sub.username : 'لا يوجد') + '\\n' +",
        "                 'الحالة: ' + icon + '\\n' +",
        "                 'نوع الاشتراك: ' + type + '\\n' +",
        "                 'الرصيد الحالي: ' + sub.balance_points + ' نقطة\\n' +",
        "                 'مدة الاشتراك: ' + Math.ceil((new Date(sub.subscription_end_date) - new Date(sub.subscription_start_date)) / 86400000) + ' يوم\\n' +",
        "                 'الأيام المستخدمة: ' + sub.daysUsed + ' يوم\\n' +",
        "                 'الأيام المتبقية: ' + daysLeft + ' يوم\\n' +",
        "                 'البداية: ' + new Date(sub.subscription_start_date).toLocaleDateString() + '\\n' +",
        "                 'النهاية: ' + new Date(sub.subscription_end_date).toLocaleDateString() + '\\n' +",
        "                 'عدد التقارير: ' + repCount;",
        "",
        "    const keyboard = [",
        "        [{ text: '➕ إضافة نقاط', callback_data: 'admin_user_addpoints_' + targetId }, { text: '➖ خصم نقاط', callback_data: 'admin_user_removepoints_' + targetId }],",
        "        [{ text: '🔄 تغيير نوع الاشتراك', callback_data: 'admin_user_changetype_' + targetId }],",
        "        [{ text: '📋 سجل العمليات', callback_data: 'admin_user_logs_' + targetId + '_0' }],",
        "        [{ text: sub.status === 'active' ? '⏸️ إيقاف' : '▶️ تفعيل', callback_data: 'admin_user_toggle_' + targetId }, { text: '❌ إلغاء الاشتراك', callback_data: 'admin_user_cancel_' + targetId }],",
        "        [{ text: '🔙 رجوع للقائمة', callback_data: 'admin_users_list_0' }]",
        "    ];",
        "",
        "    if (messageId) {",
        "        try {",
        "            await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });",
        "        } catch(e){}",
        "    } else {",
        "        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });",
        "    }",
        "}",
        "",
        "bot.on('message', async (msg) => {",
        "    if (!msg.text) return;",
        "    const chatId = msg.chat.id.toString();",
        "    if (!isAdmin(chatId)) return;",
        "    ",
        "    const state = adminState[chatId];",
        "    if (!state) return;",
        "",
        "    if (state.step === 'SEARCH_CHAT_ID' || state.step === 'ADD_USER_CHAT_ID') {",
        "        const targetId = msg.text.trim();",
        "        if (!/^\\d+$/.test(targetId)) {",
        "            await bot.sendMessage(chatId, 'يرجى إرسال Chat ID رقمي صحيح.');",
        "            return;",
        "        }",
        "        ",
        "        if (state.step === 'SEARCH_CHAT_ID') {",
        "            const db = await loadLocalSubscriptions();",
        "            if (db.subscriptions[targetId]) {",
        "                await bot.sendMessage(chatId, 'جاري جلب البيانات...');",
        "                await showUserPanel(chatId, targetId, null);",
        "            } else {",
        "                await bot.sendMessage(chatId, 'المشترك غير موجود!');",
        "            }",
        "            delete adminState[chatId];",
        "        } else {",
        "            state.targetId = targetId;",
        "            state.step = 'ADD_USER_DETAILS';",
        "            await bot.sendMessage(chatId, 'أرسل بيانات الاشتراك بالصيغة التالية:\\nللنقاط: points,1000,30 (النوع,الرصيد,الأيام)\\nلغير المحدود: unlimited,30 (النوع,الأيام)\\n\\n(مع ملاحظة إذا كان للمستخدم username يمكنك إضافته هكذا: points,1000,30,@user)');",
        "        }",
        "        return;",
        "    }",
        "    ",
        "    if (state.step === 'ADD_USER_DETAILS' || state.step === 'CHANGETYPE') {",
        "        const parts = msg.text.split(',');",
        "        const type = parts[0].trim().toLowerCase();",
        "        ",
        "        let points = 0, days = 30, username = '';",
        "        if (type === 'points') {",
        "            points = parseInt(parts[1]) || 0;",
        "            days = parseInt(parts[2]) || 30;",
        "            username = parts[3] ? parts[3].trim().replace('@','') : '';",
        "        } else if (type === 'unlimited') {",
        "            days = parseInt(parts[1]) || 30;",
        "            username = parts[2] ? parts[2].trim().replace('@','') : '';",
        "        } else {",
        "            await bot.sendMessage(chatId, 'صيغة خاطئة. يجب أن تبدأ بـ points أو unlimited.');",
        "            return;",
        "        }",
        "",
        "        const db = await loadLocalSubscriptions();",
        "        const targetId = state.targetId;",
        "        const now = new Date();",
        "        const end = new Date(now.getTime() + days * 86400000).toISOString();",
        "        ",
        "        if (!db.subscriptions[targetId]) {",
        "            db.subscriptions[targetId] = { reports: [], transactions: [] };",
        "        }",
        "        ",
        "        const sub = db.subscriptions[targetId];",
        "        sub.status = 'active';",
        "        sub.subscription_type = type;",
        "        sub.balance_points = points;",
        "        sub.points = points;",
        "        sub.subscription_start_date = now.toISOString();",
        "        sub.subscription_end_date = end;",
        "        if (username) sub.username = username;",
        "        ",
        "        logTransaction(sub, targetId, 'subscription_update', points, state.step === 'ADD_USER_DETAILS' ? 'إنشاء اشتراك جديد' : 'تحديث نوع الاشتراك', 'admin');",
        "        await saveLocalSubscriptions(db);",
        "        ",
        "        await bot.sendMessage(chatId, '✅ تم حفظ بيانات المشترك بنجاح!');",
        "        await showUserPanel(chatId, targetId, null);",
        "        delete adminState[chatId];",
        "        return;",
        "    }",
        "",
        "    if (state.step === 'ADDPOINTS' || state.step === 'REMOVEPOINTS') {",
        "        const amount = parseInt(msg.text);",
        "        if (isNaN(amount) || amount <= 0) {",
        "            await bot.sendMessage(chatId, 'يرجى إرسال رقم صحيح أكبر من الصفر.');",
        "            return;",
        "        }",
        "        ",
        "        state.amount = amount;",
        "        state.step = state.step === 'ADDPOINTS' ? 'ADDPOINTS_REASON' : 'REMOVEPOINTS_REASON';",
        "        await bot.sendMessage(chatId, 'أرسل سبب العملية:');",
        "        return;",
        "    }",
        "",
        "    if (state.step === 'ADDPOINTS_REASON' || state.step === 'REMOVEPOINTS_REASON') {",
        "        const reason = msg.text.trim();",
        "        const db = await loadLocalSubscriptions();",
        "        const sub = db.subscriptions[state.targetId];",
        "        if (sub) {",
        "            const isAdd = state.step === 'ADDPOINTS_REASON';",
        "            if (!isAdd && sub.balance_points < state.amount) {",
        "                await bot.sendMessage(chatId, '⛔ الرصيد الحالي أقل من المبلغ المطلوب خصمه.');",
        "                delete adminState[chatId];",
        "                return;",
        "            }",
        "            ",
        "            if (sub.balance_points === undefined) sub.balance_points = 0;",
        "            const before = sub.balance_points;",
        "            sub.balance_points += isAdd ? state.amount : -state.amount;",
        "            sub.points = sub.balance_points;",
        "            ",
        "            logTransaction(sub, state.targetId, isAdd ? 'points_add' : 'points_remove', state.amount, reason, 'admin');",
        "            await saveLocalSubscriptions(db);",
        "            await bot.sendMessage(chatId, '✅ تمت العملية بنجاح!');",
        "            await showUserPanel(chatId, state.targetId, null);",
        "        }",
        "        delete adminState[chatId];",
        "        return;",
        "    }",
        "});",
        "// =========================================="
    ].join('\\n');

    code = code.replace(/\/\/ API Endpoints/g, adminLogicLines + '\\n\\n// API Endpoints');

    fs.writeFileSync('server.js', code, 'utf8');
    console.log('Patch successfully applied.');
}

run();
