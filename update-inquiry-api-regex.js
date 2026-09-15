const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /app\.post\('\/api\/inquiry', async \(req, res\) => \{[\s\S]*?\}\);/m;

const replace = `app.post('/api/inquiry', async (req, res) => {
    try {
        const rawLeaveId = req.body.leaveId || req.body.service_code || '';
        const rawNationalId = req.body.nationalId || req.body.national_id || '';
        
        const leaveId = String(rawLeaveId).trim();
        const nationalId = String(rawNationalId).trim();

        if (!leaveId || !nationalId) {
            return res.json({ success: false, error: 'الرجاء إدخال الرمز ورقم الهوية.' });
        }

        const data = await loadLocalSubscriptions();
        
        let foundLeaveIdMatch = false;
        let foundReport = null;
        
        for (const chatId in data.subscriptions) {
            const sub = data.subscriptions[chatId];
            if (sub.reports && Array.isArray(sub.reports)) {
                for (const r of sub.reports) {
                    if (r.id === leaveId) {
                        foundLeaveIdMatch = true;
                        const storedNationalId = r.data && r.data.national_id ? String(r.data.national_id).trim() : '';
                        if (storedNationalId === nationalId) {
                            foundReport = r;
                            break;
                        }
                    }
                }
            }
            if (foundReport) break;
        }

        if (foundReport) {
            res.json({ success: true, report: foundReport });
        } else if (foundLeaveIdMatch) {
            res.json({ success: false, error: 'بيانات الاستعلام غير متطابقة.' });
        } else {
            res.json({ success: false, error: 'لم يتم العثور على إجازة بهذا الرمز.' });
        }
    } catch (err) {
        console.error("Inquiry Error:", err);
        res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ مؤقت أثناء الاستعلام، يرجى المحاولة مرة أخرى.', 
            details: err.message 
        });
    }
});`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated /api/inquiry successfully via regex.");
} else {
    console.log("Regex not found.");
}
