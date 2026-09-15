const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldDurRowCss = '.dur-row td { background-color: #2b4b7c; color: white; border: 1px solid #4a6a9a; padding: 10px 8px; font-size: 12px; text-align: center !important; vertical-align: middle !important; }';
const newDurRowCss = '.dur-row td { background-color: #1F3864; color: white; border: 1px solid #dee2e6; padding: 10px 8px; font-size: 12px; text-align: center !important; vertical-align: middle !important; }';

serverJs = serverJs.replace(oldDurRowCss, newDurRowCss);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified duration row background and border colors.');
