const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldCheck = `        if (!currentAdminToken || token !== currentAdminToken) {
            return res.status(401).json({ success: false, error: 'غير مصرح لك (Unauthorized)' });
        }`;

const newCheck = `        // Allow either the dynamic token or the master secret password
        if (token !== currentAdminToken && token !== 'ZAK-99X-ADMIN-2026') {
            return res.status(401).json({ success: false, error: 'الرمز السري غير صحيح!' });
        }`;

serverJs = serverJs.replace(oldCheck, newCheck);
fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified server.js to support master password');
