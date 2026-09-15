const fs = require('fs');

const fixEndpoint = (content, endpoint) => {
    const lines = content.split('\n');
    const startIdx = lines.findIndex(l => l.includes(endpoint));
    if (startIdx === -1) return content;
    
    // Find the update logic
    const isUpdateStr = "const isUpdate = (index >= 0);";
    const updateIdx = lines.findIndex((l, i) => i > startIdx && l.includes(isUpdateStr));
    if (updateIdx === -1) return content;
    
    const newLogic = `        const isUpdate = (index >= 0);
        
        if (isUpdate) {
            const existingReport = userSub.reports[index];
            if (existingReport.issueDate) {
                const issueDateObj = new Date(existingReport.issueDate);
                const now = new Date();
                if ((now - issueDateObj) > (2 * 24 * 60 * 60 * 1000)) {
                    return res.status(403).json({ success: false, error: 'لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.' });
                }
            }
        }`;
        
    lines[updateIdx] = newLogic;
    return lines.join('\n');
};

let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = fixEndpoint(serverJs, "app.post('/api/report/:chatId', async (req, res) => {");
serverJs = fixEndpoint(serverJs, "app.post('/api/generate', async (req, res) => {");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified server.js edit limits');
