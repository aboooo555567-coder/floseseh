const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Mutex implementation
if (!code.includes('class Mutex')) {
    code = code.replace(
        'const saveLocalSubscriptions = async (data) => {',
        `class Mutex {
    constructor() {
        this.queue = [];
        this.locked = false;
    }
    async lock() {
        return new Promise(resolve => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }
    unlock() {
        if (this.queue.length > 0) {
            const nextResolve = this.queue.shift();
            nextResolve();
        } else {
            this.locked = false;
        }
    }
}
const dbMutex = new Mutex();

const saveLocalSubscriptions = async (data) => {`
    );
}

// 2. Strict ADMIN_CHAT_ID
code = code.replace(
    /const ADMIN_CHAT_ID = process\.env\.ADMIN_CHAT_ID \|\| '.*?';/,
    'const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;'
);

// 3. Update verifyAdmin
code = code.replace(
    /if \(!user \|\| user\.id\.toString\(\) !== ADMIN_CHAT_ID\.toString\(\)\) {/,
    'if (!user || !ADMIN_CHAT_ID || user.id.toString() !== ADMIN_CHAT_ID.toString()) {'
);

// 4. Add dbMutex to /api/generate
if (!code.includes('await dbMutex.lock();\n    try {\n        const { chatId, report }')) {
    code = code.replace(
        /app\.post\('\/api\/generate', async \(req, res\) => {\r?\n\s+try {/,
        `app.post('/api/generate', async (req, res) => {
    await dbMutex.lock();
    try {`
    );
    // Find the catch block for /api/generate and add finally
    code = code.replace(
        /res\.status\(500\)\.json\({ success: false, error: err\.message }\);\r?\n\s+}\r?\n}\);/,
        `res.status(500).json({ success: false, error: err.message });
    } finally {
        dbMutex.unlock();
    }
});`
    );
}

// 5. Add dbMutex to /api/admin/web/user/update
if (!code.includes('await dbMutex.lock();\n    try {\n        const { chatId, action, data }')) {
    code = code.replace(
        /app\.post\('\/api\/admin\/web\/user\/update', express\.json\(\), verifyAdmin, async \(req, res\) => {\r?\n\s+try {/,
        `app.post('/api/admin/web/user/update', express.json(), verifyAdmin, async (req, res) => {
    await dbMutex.lock();
    try {`
    );
    
    code = code.replace(
        /await saveLocalSubscriptions\(db\);\r?\n\s+res\.json\({ success: true, user: normalizeSubscription\(sub\) }\);\r?\n\s+} catch \(err\) {\r?\n\s+res\.status\(500\)\.json\({ success: false, error: err\.message }\);\r?\n\s+}\r?\n}\);/,
        `await saveLocalSubscriptions(db);
        res.json({ success: true, user: normalizeSubscription(sub) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        dbMutex.unlock();
    }
});`
    );
}

// 6. Add /myid command
if (!code.includes('bot.onText(/\\/myid/')) {
    code = code.replace(
        /\/\/ Bottom Keyboard & Message Handlers/,
        `// Bottom Keyboard & Message Handlers
bot.onText(/\\/myid/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = \`🆔 **Your Telegram Numeric ID is:** \\\`\${chatId}\\\`\\n\\nIf you are the admin, copy this number and paste it into your \\\`ADMIN_CHAT_ID\\\` environment variable on Render.\`;
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});`
    );
}

fs.writeFileSync('server.js', code);
console.log('Patch applied successfully.');
