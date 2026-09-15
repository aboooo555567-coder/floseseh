const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Create a secure admin package endpoint
const newAdminEndpoint = `
// Secure Admin Endpoint to Add Packages
app.post('/api/admin/package', async (req, res) => {
    try {
        const { token, chatId, points, subscriptionDays } = req.body;
        
        if (!currentAdminToken || token !== currentAdminToken) {
            return res.status(401).json({ success: false, error: 'غير مصرح لك (Unauthorized)' });
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
`;

// Insert the new endpoint before app.post('/api/user/:chatId/package'
serverJs = serverJs.replace("app.post('/api/user/:chatId/package'", newAdminEndpoint + "\napp.post('/api/user/:chatId/package'");

// 2. Update report endpoint to deduct points and check both types
const oldReportValidation = `        const normalized = normalizeSubscription(userSub);
        
        if (normalized.subscriptionDays <= 0) {
            return res.status(403).json({ success: false, error: 'Subscription required' });
        }`;

const newReportValidation = `        const normalized = normalizeSubscription(userSub);
        
        const isUpdate = userSub.reports && userSub.reports.find(r => r.id === reportData.id);
        
        // If it's not an update, check if they can generate a new report
        if (!isUpdate) {
            if (normalized.subscriptionDays <= 0 && (normalized.points || 0) < 1) {
                return res.status(403).json({ success: false, error: 'عذراً، انتهى اشتراكك أو نفدت نقاطك.' });
            }
            // Deduct point if they are not on unlimited days
            if (normalized.subscriptionDays <= 0) {
                normalized.points -= 1;
            }
        }`;

serverJs = serverJs.replace(oldReportValidation, newReportValidation);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified server.js for secure admin and point deduction');
