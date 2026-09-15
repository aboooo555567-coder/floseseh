const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /keyboard: \[\s*\[\{ text: '[^']+', web_app: \{ url: WEB_APP_URL_CACHED \} \}\],\s*\[\{ text: '[^']+' \}, \{ text: '[^']+' \}\],\s*\[\{ text: '[^']+' \}\],\s*\[\{ text: '[^']+' \}\]\s*\],/g;

const replacement = `keyboard: [
                [{ text: '🛒 متجر الباقات' }, { text: '🔗 كسب نقاط (الإحالات)' }],
                [{ text: '📊 حالة حسابي' }]
            ],`;

serverJs = serverJs.replace(regex, replacement);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Regex replaced keyboard layout.");
