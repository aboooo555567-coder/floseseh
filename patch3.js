const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add Mutex class
const mutexCode = `class Mutex {
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
    code = code.replace(
        /const adminState = \{\};\nconst isAdmin/,
        mutexCode + 'const adminState = {};\nconst isAdmin'
    );
}

// 2. Wrap /api/generate
if (!code.includes('await dbMutex.lock();') || !code.includes("app.post('/api/generate', async (req, res) => {\n    await dbMutex.lock();")) {
    code = code.replace(
        /app\.post\('\/api\/generate', async \(req, res\) => \{\r?\n\s+try \{/,
        "app.post('/api/generate', async (req, res) => {\n    await dbMutex.lock();\n    try {"
    );
}

// 3. Wrap /api/admin/web/user/update
if (!code.includes("app.post('/api/admin/web/user/update', express.json(), verifyAdmin, async (req, res) => {\n    await dbMutex.lock();")) {
    code = code.replace(
        /app\.post\('\/api\/admin\/web\/user\/update', express\.json\(\), verifyAdmin, async \(req, res\) => \{\r?\n\s+try \{/,
        "app.post('/api/admin/web/user/update', express.json(), verifyAdmin, async (req, res) => {\n    await dbMutex.lock();\n    try {"
    );
    
    // Add finally { dbMutex.unlock(); } to user/update
    code = code.replace(
        /res\.json\(\{ success: true, users \}\);\r?\n\s+\} catch \(err\) \{\r?\n\s+res\.status\(500\)\.json\(\{ success: false, error: err\.message \}\);\r?\n\s+\}\r?\n\}\);/,
        `res.json({ success: true, users });\n    } catch (err) {\n        res.status(500).json({ success: false, error: err.message });\n    } finally {\n        dbMutex.unlock();\n    }\n});`
    );
}

fs.writeFileSync('server.js', code);
console.log('Restored Mutex!');
