const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const fixLogic = `
        addLog('Generating PDF via Puppeteer...');
        const pdfResult = await page.pdf({
            printBackground: true,
            width: '794px',
            height: '1123px',
            pageRanges: '1'
        });
        await browser.close();
        
        // CRITICAL FIX: Puppeteer > v22 returns a Uint8Array instead of a Buffer.
        // node-telegram-bot-api (via request/form-data) attempts to deeply stringify Uint8Array
        // treating it as a standard object, causing 'Maximum call stack size exceeded' and crashing Node!
        // We MUST convert it back to a standard Node Buffer.
        const pdfBuffer = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult);

        addLog('Sending PDF to Telegram...');
        const message = await bot.sendDocument(chatId, pdfBuffer, {
`;

serverJs = serverJs.replace(
    /addLog\('Generating PDF via Puppeteer\.\.\.'\);[\s\S]*?const message = await bot\.sendDocument\(chatId, pdfBuffer, \{/,
    fixLogic.trim()
);

// Also cache bust just in case
serverJs = serverJs.replace(/\?v=\d+/g, '?v=45');

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed Uint8Array Buffer bug in server.js');
