const fs = require('fs');

// ===== STEP 1: Update app.js to send hospitalLogoUrl in reportDataPayload =====
let appJs = fs.readFileSync('app.js', 'utf8');

const searchApp = `            hospitalEn: hospEn,`;
const replaceApp = `            hospitalEn: hospEn,
            hospitalLogoBase64: this.state.hospitalLogoUrl || null,`;

if (appJs.includes(searchApp)) {
    appJs = appJs.replace(searchApp, replaceApp);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log("[app.js] Added hospitalLogoBase64 to reportDataPayload.");
} else {
    console.log("[app.js] Could not find search string.");
}

// ===== STEP 2: Update server.js to use uploaded logo if available =====
let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace the mohLogo usage in the PDF template to check for user-uploaded logo
const searchSrv = '        <img src="${mohLogo}" style="height:115px;object-fit:contain;margin-bottom:10px;">';
const replaceSrv = '        <img src="${d.hospitalLogoBase64 || mohLogo}" style="height:115px;object-fit:contain;margin-bottom:10px;">';

if (serverJs.includes(searchSrv)) {
    serverJs = serverJs.replace(searchSrv, replaceSrv);
    fs.writeFileSync('serverJs', serverJs, 'utf8');
    console.log("[server.js] Updated PDF template to use user logo if available.");
} else {
    // Try without the leading spaces
    const searchSrv2 = `\${mohLogo}`;
    // Let's just do a simple replace of the img tag
    const searchSrv3 = 'src="${mohLogo}" style="height:115px';
    const replaceSrv3 = 'src="${d.hospitalLogoBase64 || mohLogo}" style="height:115px';
    
    if (serverJs.includes(searchSrv3)) {
        serverJs = serverJs.replace(searchSrv3, replaceSrv3);
        fs.writeFileSync('server.js', serverJs, 'utf8');
        console.log("[server.js] Updated PDF template (alt match) to use user logo if available.");
    } else {
        console.log("[server.js] Could not find any matching string. Manual inspection needed.");
    }
}
