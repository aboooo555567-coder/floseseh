const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const startBlock = "    if (msg.text === '👨‍💻 حالة الحساب') {";
const endBlock = "await bot.sendMessage(chatId, statusMsg);\n        return;\n    }";

// Because of encoding in powerShell, let's use indexOf with fragments
const startIdx = serverJs.indexOf("const user = await findSubscription(chatId, username);\n        const daysLeft = user.subscriptionDays || 0;\n        const statusText = daysLeft > 0 ?");
if (startIdx !== -1) {
    // Find the enclosing if (msg.text === '...') {
    let ifStart = serverJs.lastIndexOf("if (msg.text === '", startIdx);
    let returnEnd = serverJs.indexOf("return;\n    }", startIdx);
    if (ifStart !== -1 && returnEnd !== -1) {
        const replacement = serverJs.substring(ifStart, serverJs.indexOf('{', ifStart) + 1) + "\n        await sendMyStatusMessage(chatId, username);\n        return;\n    }";
        serverJs = serverJs.substring(0, ifStart) + replacement + serverJs.substring(returnEnd + 14);
        fs.writeFileSync('server.js', serverJs, 'utf8');
        console.log("Updated bot message handler for status.");
    } else {
        console.log("Could not find bounds.");
    }
} else {
    console.log("Could not find target inline logic.");
}
