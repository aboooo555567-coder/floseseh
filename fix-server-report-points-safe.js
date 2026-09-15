const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes("app.post('/api/report/:chatId', async (req, res) => {"));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("app.delete('/api/report/:chatId/:id', async"));

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = `app.post('/api/report/:chatId', async (req, res) => {
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

// 4. Delete Report`.split('\n');

    lines.splice(startIdx, endIdx - startIdx, ...newLines);
    fs.writeFileSync('server.js', lines.join('\n'), 'utf8');
    console.log('Replaced safely!');
} else {
    console.log('Could not find indices!');
}
