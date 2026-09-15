const { fork } = require('child_process');
const fs = require('fs');

const env = Object.assign({}, process.env, {
    TELEGRAM_BOT_TOKEN: "***REDACTED-BOT-TOKEN***",
    ADMIN_CHAT_ID: "1211116248",
    PORT: 3000
});

const out = fs.openSync('server_debug.log', 'w');
const serverProcess = fork('server.js', [], { env, stdio: ['ignore', out, out, 'ipc'] });

setTimeout(() => {
    console.log('Running tests...');
    const testProcess = fork('test_e2e_final.js', [], { env, stdio: 'inherit' });
    
    testProcess.on('exit', (code) => {
        console.log('Tests exited with code ' + code);
        serverProcess.kill();
        process.exit(code);
    });
}, 15000);

