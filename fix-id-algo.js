const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const searchStr = `        const rand5 = Math.floor(Math.random() * 100000).toString().padStart(5, '0'); // exact 5 digits with leading zeros allowed`;

const replaceStr = `        // Generate a fundamentally sequential ID (based on time) but protected by an Affine Cipher algorithm
        // This ensures chronological uniqueness while preventing +1 guessing.
        const seqId = Math.floor(Date.now() / 1000) % 100000;
        const obfuscatedId = (47313 * seqId + 15923) % 100000;
        const rand5 = obfuscatedId.toString().padStart(5, '0');`;

if(appJs.includes(searchStr)) {
    appJs = appJs.replace(searchStr, replaceStr);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("Updated ID generation with obfuscated sequential algorithm!");
} else {
    console.log("String not found!");
}
