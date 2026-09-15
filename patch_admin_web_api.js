const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const apiLogic = `
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
`;

code = code.replace(/\/\/ API Endpoints/, '// API Endpoints\n' + apiLogic);
fs.writeFileSync('server.js', code, 'utf8');
console.log('Web APIs injected successfully.');
