const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldApiRegex = /app\.post\('\/api\/generate', async \(req, res\) => \{[\s\S]*?await saveLocalSubscriptions\(data\);\s*res\.json\(\{ success: true, report \}\);\s*\} catch \(err\) \{\s*res\.status\(500\)\.json\(\{ success: false, error: err\.message \}\);\s*\}\s*\}\);/g;

const newApi = \pp.post('/api/generate', async (req, res) => {
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

        if (!userSub.reports) userSub.reports = [];
        const index = userSub.reports.findIndex(r => r.id === report.id);
        const isUpdate = (index >= 0);
        
        if (isUpdate) {
            const existingReport = userSub.reports[index];
            if (existingReport.issueDate) {
                const issueDateObj = new Date(existingReport.issueDate);
                const now = new Date();
                if ((now - issueDateObj) > (2 * 24 * 60 * 60 * 1000)) {
                    return res.status(403).json({ success: false, error: 'áÇ íãßä ÊÚÏíá ÇáÊŞÑíÑ ÈÚÏ ãÑæÑ íæãíä.' });
                }
            }
        }

        if (!isUpdate) {
            // New report validation
            if (userSub.status !== 'active') {
                return res.status(403).json({ success: false, error: 'ÇáÇÔÊÑÇß ÛíÑ İÚÇá Ãæ ãæŞæİ.' });
            }
            
            const now = new Date();
            if (userSub.subscription_end_date && new Date(userSub.subscription_end_date) < now) {
                userSub.status = 'expired';
                await saveLocalSubscriptions(data);
                return res.status(403).json({ success: false, error: 'ÚĞÑÇğ¡ áŞÏ ÇäÊåÊ ãÏÉ ÇáÇÔÊÑÇß.' });
            }

            if (userSub.subscription_type === 'points') {
                const bal = userSub.balance_points || userSub.points || 0;
                if (bal < 5) {
                    return res.status(403).json({ success: false, error: 'ÑÕíÏ ÇáäŞÇØ ÛíÑ ßÇİò. ÊÍÊÇÌ Åáì 5 äŞÇØ Úáì ÇáÃŞá.' });
                }
                // Deduct 5 points
                userSub.balance_points = bal - 5;
                userSub.points = userSub.balance_points;
                logTransaction(userSub, chatIdStr, 'generate_report', -5, 'ÎÕã áÅäÔÇÁ ÊŞÑíÑ', 'system');
            }
        }

        if (isUpdate) {
            userSub.reports[index] = report;
        } else {
            userSub.reports.push(report);
        }

        userSub.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);

        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});\;

code = code.replace(oldApiRegex, newApi);
fs.writeFileSync('server.js', code, 'utf8');
console.log('API /api/generate updated successfully.');
