const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes("app.post('/api/generate', async (req, res) => {"));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("app.post('/api/admin/package', async (req, res) => {"));

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = `app.post('/api/generate', async (req, res) => {
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

// Secure Admin Endpoint to Add Packages`.split('\n');

    lines.splice(startIdx, endIdx - startIdx, ...newLines);
    fs.writeFileSync('server.js', lines.join('\n'), 'utf8');
    console.log('Replaced /api/generate safely!');
} else {
    console.log('Could not find indices!');
}
