const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Find a good place to insert the endpoint, maybe after the admin endpoints.
const targetLine = "app.post('/api/admin/package'";
const insertIndex = serverJs.indexOf(targetLine);

if (insertIndex !== -1) {
    const endpointCode = `
// --- Inquiry Endpoint ---
app.get('/inquiry', (req, res) => {
    res.sendFile(path.join(__dirname, 'inquiry.html'));
});

app.post('/api/inquiry', async (req, res) => {
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
            res.json({ success: false, error: 'التقرير غير موجود أو البيانات غير متطابقة' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

`;
    const newServerJs = serverJs.slice(0, insertIndex) + endpointCode + serverJs.slice(insertIndex);
    fs.writeFileSync('server.js', newServerJs, 'utf8');
    console.log('Inquiry endpoint added to server.js');
} else {
    console.log('Target line not found in server.js');
}
