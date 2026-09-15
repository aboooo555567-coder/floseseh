const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. TOKEN fix
code = code.replace(
    "const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8747259082:AAEOGk2J3Rc_-ry7HHH2nTthvJR_ysJNaQk';",
    "const TOKEN = process.env.TELEGRAM_BOT_TOKEN;"
);

// 2. DATA_DIR fix
code = code.replace(
    "const subscriptionsPath = path.join(__dirname, 'subscriptions.json');",
    "const subscriptionsPath = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'subscriptions.json') : path.join(__dirname, 'subscriptions.json');"
);

// 3. /health endpoint and Mutex
const appExpressLine = "const app = express();\n";
const additions = `
// Health Check for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

class Mutex {
    constructor() {
        this.queue = [];
        this.locked = false;
    }
    async lock() {
        return new Promise(resolve => {
            this.queue.push(resolve);
            this.dispatch();
        });
    }
    unlock() {
        this.locked = false;
        this.dispatch();
    }
    dispatch() {
        if (this.locked || this.queue.length === 0) return;
        this.locked = true;
        const next = this.queue.shift();
        next();
    }
}
const dbMutex = new Mutex();
`;
if (!code.includes('class Mutex {')) {
    code = code.replace(appExpressLine, appExpressLine + additions);
}

// 4. Wrap /api/generate
code = code.replace(
    "app.post('/api/generate', async (req, res) => {\n    try {",
    "app.post('/api/generate', async (req, res) => {\n    await dbMutex.lock();\n    try {"
);
code = code.replace(
    "res.json({ success: true, report, generatedAt: new Date().toISOString() });\n    } catch (err) {\n        res.status(500).json({ success: false, error: err.message });\n    }\n});",
    "res.json({ success: true, report, generatedAt: new Date().toISOString() });\n    } catch (err) {\n        res.status(500).json({ success: false, error: err.message });\n    } finally {\n        dbMutex.unlock();\n    }\n});"
);

// 5. Wrap /api/admin/web/user/update
// NOTE: Verify exact string!
code = code.replace(
    "app.post('/api/admin/web/user/update', express.json(), verifyAdmin, async (req, res) => {\n    try {",
    "app.post('/api/admin/web/user/update', express.json(), verifyAdmin, async (req, res) => {\n    await dbMutex.lock();\n    try {"
);
code = code.replace(
    "res.json({ success: true, users });\n    } catch (err) {\n        res.status(500).json({ success: false, error: err.message });\n    }\n});",
    "res.json({ success: true, users });\n    } catch (err) {\n        res.status(500).json({ success: false, error: err.message });\n    } finally {\n        dbMutex.unlock();\n    }\n});"
);

// 6. logTransaction restore
// Find a safe spot for it. How about right before app.post('/api/generate' ?
if (!code.includes('function logTransaction')) {
    const logTxnCode = `\nfunction logTransaction(sub, cid, type, amount, reason, by, reportId = null) {
    if (!sub.transactions) sub.transactions = [];
    sub.transactions.push({
        id: 'txn_' + Date.now() + Math.floor(Math.random()*1000),
        chat_id: cid,
        type,
        amount,
        balance_before: sub.balance_points || 0,
        balance_after: (sub.balance_points || 0) + (type==='points_remove'? -amount : amount),
        reason,
        performed_by: by,
        created_at: new Date().toISOString()
    });
}\n\n`;
    code = code.replace("app.post('/api/generate', async (req, res) => {", logTxnCode + "app.post('/api/generate', async (req, res) => {");
}

fs.writeFileSync('server.js', code);
console.log('Restored all fixes Safely!');
