const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

let blockStart = serverJs.indexOf("bot.on('message', async (msg) => {");
let inlineStart = serverJs.indexOf("const user = await findSubscription(chatId, username);", blockStart);

if (inlineStart !== -1) {
    let ifStart = serverJs.lastIndexOf("if (msg.text === '", inlineStart);
    let returnEnd = serverJs.indexOf("return;\n    }", inlineStart);
    if (returnEnd === -1) returnEnd = serverJs.indexOf("return;\r\n    }", inlineStart);
    
    if (ifStart !== -1 && returnEnd !== -1) {
        let bracketEnd = serverJs.indexOf("{", ifStart);
        let replacement = serverJs.substring(ifStart, bracketEnd + 1) + "\n        await sendMyStatusMessage(chatId, username);\n        return;\n    }";
        
        let newServerJs = serverJs.substring(0, ifStart) + replacement + serverJs.substring(returnEnd + 14); // 14 for 'return;\n    }' or close enough
        
        // Let's just do a safer substring
        let afterPart = serverJs.substring(returnEnd);
        let afterPartReal = afterPart.substring(afterPart.indexOf('}') + 1);
        
        serverJs = serverJs.substring(0, ifStart) + replacement + afterPartReal;
        fs.writeFileSync('server.js', serverJs, 'utf8');
        console.log("Fixed routing safely.");
    }
}
