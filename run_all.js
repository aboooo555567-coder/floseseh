const { fork } = require('child_process');
const net = require('net');

const env = Object.assign({}, process.env, {
    TELEGRAM_BOT_TOKEN: "***REDACTED-BOT-TOKEN***",
    ADMIN_CHAT_ID: "1211116248",
    PORT: 3000
});

const serverProcess = fork('server.js', [], { env, stdio: 'inherit' });

function waitForServer(port, callback) {
    const client = new net.Socket();
    client.connect({ port }, () => {
        client.destroy();
        callback();
    });
    client.on('error', () => {
        setTimeout(() => waitForServer(port, callback), 1000);
    });
}

waitForServer(3000, () => {
    console.log('Server is up, running tests...');
    const testProcess = fork('test_e2e_final.js', [], { env, stdio: 'inherit' });
    
    testProcess.on('exit', (code) => {
        console.log('Tests exited with code ' + code);
        serverProcess.kill();
        process.exit(code);
    });
});
