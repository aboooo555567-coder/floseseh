const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const oldUrl = `const adminUrl = \`\${process.env.APP_URL || 'https://seha-sickleave-app.onrender.com'}/admin.html?token=\${currentAdminToken}\`;`;
const newUrl = `const adminUrl = \`\${process.env.APP_URL || 'https://seha-sickleave-app.onrender.com'}/index.html?screen=admin&token=\${currentAdminToken}\`;`;

serverJs = serverJs.replace(oldUrl, newUrl);
fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified server.js adminUrl');
