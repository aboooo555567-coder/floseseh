const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Ensure crypto is required
if (!code.includes("const crypto = require('crypto');")) {
    code = code.replace("const path = require('path');", "const path = require('path');\nconst crypto = require('crypto');");
}

const newApiBlock = `
// --- TELEGRAM INIT DATA VERIFICATION ---
function verifyTelegramWebData(initData) {
    if (!initData) return false;
    try {
        const q = new URLSearchParams(initData);
        const hash = q.get('hash');
        q.delete('hash');
        
        const keys = Array.from(q.keys());
        keys.sort();
        const dataCheckString = keys.map(k => \`\${k}=\${q.get(k)}\`).join('\\n');
        
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        
        if (computedHash === hash) {
            const userStr = q.get('user');
            if (userStr) {
                return JSON.parse(userStr);
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function verifyAdmin(req, res, next) {
    const initData = req.headers['x-admin-token'] || req.body.token || req.query.token;
    const user = verifyTelegramWebData(initData);
    
    if (!user || user.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return res.status(403).json({ success: false, error: '⛔ ليس لديك صلاحية للوصول إلى لوحة المشرف.' });
    }
    
    req.adminUser = user;
    next();
}
// -----------------------------------------

// --- NEW WEB ADMIN APIs ---
app.get('/api/admin/web/stats', verifyAdmin, async (req, res) => {
    try {
        const db = await loadLocalSubscriptions();
        let totalSubs = 0, activeSubs = 0, suspendedSubs = 0, expiredSubs = 0;
        let totalPoints = 0, totalReports = 0, pointsSubs = 0, unlimitedSubs = 0;
        const now = new Date();

        for (const cid in db.subscriptions) {
            const sub = normalizeSubscription(db.subscriptions[cid]);
            totalSubs++;
            
            // Auto check expiry
            const isExpired = sub.subscription_end_date && new Date(sub.subscription_end_date) < now;
            if (isExpired && sub.status === 'active') {
                sub.status = 'expired';
            }

            if (sub.status === 'active') activeSubs++;
            else if (sub.status === 'suspended') suspendedSubs++;
            else expiredSubs++;

            if (sub.subscription_type === 'points') {
                pointsSubs++;
                totalPoints += (sub.balance_points || 0);
            } else {
                unlimitedSubs++;
            }

            totalReports += (sub.reports ? sub.reports.length : 0);
        }

        res.json({ 
            success: true, 
            stats: { 
                totalSubs, activeSubs, suspendedSubs, expiredSubs, 
                totalPoints, totalReports, pointsSubs, unlimitedSubs 
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/web/users', verifyAdmin, async (req, res) => {
    try {
        const db = await loadLocalSubscriptions();
        const users = [];
        const now = new Date();
        for (const cid in db.subscriptions) {
            const sub = normalizeSubscription(db.subscriptions[cid]);
            // Check expiry
            const isExpired = sub.subscription_end_date && new Date(sub.subscription_end_date) < now;
            if (isExpired && sub.status === 'active') sub.status = 'expired';
            
            users.push({
                chatId: cid,
                username: sub.username || '',
                status: sub.status,
                type: sub.subscription_type,
                points: sub.balance_points || 0,
                daysLeft: sub.subscriptionDays, // Note: better calculated on frontend using dates
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

app.post('/api/admin/web/user/update', express.json(), verifyAdmin, async (req, res) => {
    try {
        const { chatId, action, data } = req.body;
        const db = await loadLocalSubscriptions();
        if (!db.subscriptions[chatId] && action !== 'create') {
            return res.status(404).json({ success: false, error: 'المشترك غير موجود' });
        }
        if (action === 'create' && !db.subscriptions[chatId]) {
            db.subscriptions[chatId] = { reports: [], transactions: [] };
        }

        const sub = db.subscriptions[chatId];
        sub.transactions = sub.transactions || [];
        
        const now = new Date();

        if (action === 'add_points' || action === 'remove_points') {
            const amount = parseInt(data.amount);
            if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'كمية غير صالحة' });
            if (action === 'remove_points' && (sub.balance_points || 0) < amount) {
                return res.status(400).json({ success: false, error: 'الرصيد لا يكفي ولا يمكن أن يكون سالبًا' });
            }
            
            sub.balance_points = (sub.balance_points || 0) + (action === 'add_points' ? amount : -amount);
            sub.points = sub.balance_points;
            logTransaction(sub, chatId, action, amount, data.reason || 'تعديل يدوي من الإدارة', 'web_admin');
        } 
        else if (action === 'toggle_status') {
            sub.status = sub.status === 'active' ? 'suspended' : 'active';
            logTransaction(sub, chatId, 'status_change', 0, 'تغيير الحالة إلى ' + sub.status, 'web_admin');
        }
        else if (action === 'cancel') {
            sub.status = 'cancelled';
            logTransaction(sub, chatId, 'cancel', 0, 'إلغاء الاشتراك', 'web_admin');
        }
        else if (action === 'renew' || action === 'create' || action === 'update_type') {
            const type = data.type || sub.subscription_type || 'points'; 
            const days = parseInt(data.days) || 30;
            const points = parseInt(data.points) || 0;
            
            let startDate = now;
            if (action === 'renew' && sub.subscription_end_date && new Date(sub.subscription_end_date) > now) {
                // if renewing active sub, extend from end date
                startDate = new Date(sub.subscription_end_date);
            }
            
            const end = new Date(startDate.getTime() + days * 86400000).toISOString();
            
            sub.status = 'active';
            sub.subscription_type = type;
            if (action !== 'update_type' || !sub.subscription_start_date) {
                sub.subscription_start_date = (action === 'renew' && sub.subscription_start_date) ? sub.subscription_start_date : now.toISOString();
            }
            sub.subscription_end_date = end;
            
            if (type === 'points' && (action === 'create' || action === 'renew')) {
                sub.balance_points = (sub.balance_points || 0) + points;
                sub.points = sub.balance_points;
            }
            if (data.username) sub.username = data.username.replace('@','');
            
            logTransaction(sub, chatId, action, type === 'points' ? points : 0, \`\${action} - \${days} يوم\`, 'web_admin');
        }

        await saveLocalSubscriptions(db);
        res.json({ success: true, user: normalizeSubscription(sub) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/web/user/:id/logs', verifyAdmin, async (req, res) => {
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
`;

// Extract everything between // --- NEW WEB ADMIN APIs --- and // --- END NEW WEB ADMIN APIs ---
const startMarker = "// --- NEW WEB ADMIN APIs ---";
const endMarker = "// --- END NEW WEB ADMIN APIs ---";
const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    // Delete the previous token and verifyWebToken functions too, they should be above startMarker
    code = code.substring(0, code.indexOf('const WEB_ADMIN_TOKEN')) + newApiBlock + code.substring(endIdx + endMarker.length);
}

// Modify /admin bot command to remove security tokens
code = code.replace(/const currentAdminToken[\s\S]*?adminTokens\[currentAdminToken\] = true;/g, '');
code = code.replace(/const adminUrl = \`\$\{process\.env\.APP_URL \|\| 'https:\/\/seha-sickleave-app\.onrender\.com'\}\/index\.html\?screen=admin&token=\$\{currentAdminToken\}\`;/g, 
    'const adminUrl = `${process.env.APP_URL || "https://seha-sickleave.onrender.com"}/index.html?screen=admin`;');
code = code.replace(/const adminUrl = \`\$\{process\.env\.APP_URL \|\| 'https:\/\/seha-sickleave\.onrender\.com'\}\/index\.html\?screen=admin&token=\$\{currentAdminToken\}\`;/g, 
    'const adminUrl = `${process.env.APP_URL || "https://seha-sickleave.onrender.com"}/index.html?screen=admin`;');

fs.writeFileSync('server.js', code, 'utf8');
console.log('Server APIs patched successfully.');
