const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const injection = `
        // Ensure Puppeteer Chrome is installed on Render
        try {
            console.log('Checking and installing Puppeteer Chrome if missing...');
            const { execSync } = require('child_process');
            execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
            console.log('Chrome installation verified.');
        } catch (err) {
            console.error('Failed to ensure Chrome:', err.message);
        }

        app.listen`;

serverJs = serverJs.replace('app.listen', injection);
fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Injected Chrome install on startup.');
