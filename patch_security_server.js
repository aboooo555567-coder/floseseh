const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add crypto require if not exists
if (!code.includes("const crypto = require('crypto');")) {
    code = code.replace("const path = require('path');", "const path = require('path');\nconst crypto = require('crypto');");
}

// 2. Replace verifyWebToken
const newVerify = \
// --- TELEGRAM INIT DATA VERIFICATION ---
function verifyTelegramWebData(initData) {
    if (!initData) return false;
    try {
        const q = new URLSearchParams(initData);
        const hash = q.get('hash');
        q.delete('hash');
        
        const keys = Array.from(q.keys());
        keys.sort();
        const dataCheckString = keys.map(k => \\=\\).join('\\n');
        
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        
        if (computedHash === hash) {
            const userStr = q.get('user');
            if (userStr) {
                return JSON.parse(userStr);
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function verifyAdmin(req, res, next) {
    const initData = req.headers['x-admin-token'] || req.body.token || req.query.token;
    const user = verifyTelegramWebData(initData);
    
    if (!user || user.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return res.status(403).json({ success: false, error: '? ·Ì” ·œÌﬂ ’·«ÕÌ… ··Ê’Ê· ≈·Ï ·ÊÕ… «·„‘—›.' });
    }
    
    req.adminUser = user;
    next();
}
// -----------------------------------------
\;

code = code.replace(/function verifyWebToken[\s\S]*?next\(\);\s*\}/, newVerify);
code = code.replace(/verifyWebToken/g, 'verifyAdmin');

// Update backend bot /admin command to just send a button to the WebApp without token
code = code.replace(/const currentAdminToken = crypto\.randomBytes\(16\)\.toString\('hex'\);[\s\S]*?adminTokens\[currentAdminToken\] = true;/g, '');
code = code.replace(/const adminUrl = \\$\{process\.env\.APP_URL \|\| 'https:\/\/seha-sickleave-app\.onrender\.com'\}\/index\.html\?screen=admin&token=\$\{currentAdminToken\}\;/g, 
    'const adminUrl = ${process.env.APP_URL || \\'https://seha-sickleave-app.onrender.com\\'}/index.html?screen=admin;');
code = code.replace(/const adminUrl = \\$\{process\.env\.APP_URL \|\| 'https:\/\/seha-sickleave-app\.onrender\.com'\}\/admin\?token=\$\{currentAdminToken\}\;/g, ''); // just in case

// Fix API endpoints in server.js
// I will completely replace the "WEB ADMIN APIs" block with the new extensive logic
const oldApisRegex = /\/\/ --- NEW WEB ADMIN APIs ---[\s\S]*?\/\/ --- END NEW WEB ADMIN APIs ---/g;

const newApis = \
// --- NEW WEB ADMIN APIs ---
\ // Inject verification logic here just to be safe if regex failed above, but actually let's skip to avoid duplication

// Clean duplication
\;
// Actually, I'll just write a new file instead of complex regex patching
