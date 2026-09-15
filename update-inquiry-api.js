const fs = require('fs');
const path = require('path');
let serverJs = fs.readFileSync('server.js', 'utf8');

const search = `app.post('/api/inquiry', async (req, res) => {
    try {
        const { leaveId, nationalId } = req.body;
        const data = await loadLocalSubscriptions();
        
        let foundReport = null;
        for (const chatId in data.subscriptions) {
            const sub = data.subscriptions[chatId];
            if (sub.reports) {
                const report = sub.reports.find(r => r.id === leaveId && r.data.national_id === nationalId);
                if (report) {
                    foundReport = report;
                    break;
                }
            }
        }

        if (foundReport) {
            res.json({ success: true, report: foundReport });
        } else {
            res.json({ success: false, error: '??????? ??? ????? ? ???????? ??? ??????' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});`;

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
                        // Match ID (handling possible numbers/strings mismatches safely)
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

if (serverJs.includes(search)) {
    serverJs = serverJs.replace(search, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated /api/inquiry in server.js");
} else {
    console.log("String not found in server.js");
}
