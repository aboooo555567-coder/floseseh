const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/function logTransaction[\s\S]*?\}\n\n?/g, '');

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

code = code.replace("app.post('/api/admin/web/user/update'", logTxnCode + "app.post('/api/admin/web/user/update'");
fs.writeFileSync('server.js', code);
console.log('Fixed logTransaction!');
