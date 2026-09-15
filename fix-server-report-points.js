const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const targetMethodStart = `app.post('/api/report/:chatId', async (req, res) => {`;
const targetMethodEndString = `        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});`;

const originalMethod = serverJs.substring(
    serverJs.indexOf(targetMethodStart),
    serverJs.indexOf(targetMethodEndString) + targetMethodEndString.length
);

const newMethod = `app.post('/api/report/:chatId', async (req, res) => {
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
            
            // Deduct points only if it's not an unlimited subscription
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
});`;

serverJs = serverJs.replace(originalMethod, newMethod);
fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified /api/report/:chatId to deduct 5 points safely');
