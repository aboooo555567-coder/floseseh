const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. TOKEN fix
code = code.replace(
    /const TOKEN = process\.env\.TELEGRAM_BOT_TOKEN \|\| '***REDACTED-BOT-TOKEN***';/,
    'const TOKEN = process.env.TELEGRAM_BOT_TOKEN;'
);

// 2. DATA_DIR fix
code = code.replace(
    /const subscriptionsPath = path\.join\(__dirname, 'subscriptions\.json'\);/,
    "const subscriptionsPath = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'subscriptions.json') : path.join(__dirname, 'subscriptions.json');"
);

// 3. /health endpoint
code = code.replace(
    /app\.use\(express\.static\(__dirname\)\);/,
    `app.use(express.static(__dirname));\n\n// Health Check for Render\napp.get('/health', (req, res) => {\n    res.status(200).json({ status: 'ok' });\n});`
);

// 4. logTransaction restore
if (!code.includes('function logTransaction')) {
    code = code.replace(
        /(\/\/\s*---\s*NEW WEB ADMIN APIs\s*---)/,
        `function logTransaction(sub, cid, type, amount, reason, by, reportId = null) {\n    if (!sub.transactions) sub.transactions = [];\n    sub.transactions.push({\n        id: 'txn_' + Date.now() + Math.floor(Math.random()*1000),\n        chat_id: cid,\n        type,\n        amount,\n        balance_before: sub.balance_points || 0,\n        balance_after: (sub.balance_points || 0) + (type==='points_remove'? -amount : amount),\n        reason,\n        performed_by: by,\n        created_at: new Date().toISOString()\n    });\n}\n\n$1`
    );
}

// 5. /api/generate mutex unlock fix
code = code.replace(
    /res\.json\(\{ success: true, report, generatedAt: new Date\(\)\.toISOString\(\) \}\);\r?\n\s+\} catch \(err\) \{\r?\n\s+res\.status\(500\)\.json\(\{ success: false, error: err\.message \}\);\r?\n\s+\}\r?\n\}\);/,
    `res.json({ success: true, report, generatedAt: new Date().toISOString() });\n    } catch (err) {\n        res.status(500).json({ success: false, error: err.message });\n    } finally {\n        dbMutex.unlock();\n    }\n});`
);

fs.writeFileSync('server.js', code);
console.log('Restored all fixes!');
