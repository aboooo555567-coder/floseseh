const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Fix findSubscription overwriting reports
const findSubscriptionRegex = /if \(foundChatId !== chatIdStr\) \{\s*delete data\.subscriptions\[foundChatId\];\s*data\.subscriptions\[chatIdStr\] = userSub;\s*\}/s;

const findSubscriptionReplacement = `if (foundChatId !== chatIdStr) {
            const existingActive = data.subscriptions[chatIdStr];
            if (existingActive) {
                existingActive.points = (existingActive.points || 0) + (userSub.points || 0);
                if (userSub.subscriptionDays > (existingActive.subscriptionDays || 0)) {
                    existingActive.subscriptionDays = userSub.subscriptionDays;
                    existingActive.subscriptionExpires = userSub.subscriptionExpires;
                }
                if (userSub.username) existingActive.username = userSub.username;
                
                // CRUCIAL: Preserve existing reports!
                if (!existingActive.reports) existingActive.reports = [];
                if (userSub.reports && userSub.reports.length > 0) {
                    existingActive.reports = [...existingActive.reports, ...userSub.reports];
                }
                
                data.subscriptions[chatIdStr] = existingActive;
                userSub = existingActive; // update the local reference
            } else {
                data.subscriptions[chatIdStr] = userSub;
            }
            delete data.subscriptions[foundChatId];
        }`;

serverJs = serverJs.replace(findSubscriptionRegex, findSubscriptionReplacement);


// 2. Add an automated Menu Button update on boot without needing ?v=timestamp cache-buster that breaks Telegram's cache
// Let's modify configureChatMenuButton to not use a Date.now() timestamp, but rather a stable app version.
// First, find configureChatMenuButton function
const menuBtnRegex = /const configureChatMenuButton = async \(targetChatId = null\) => \{.*?const url = `\$\{WEB_APP_URL\}\/index\.html\?v=\$\{Date\.now\(\)\}`;/s;
const menuBtnReplacement = `const configureChatMenuButton = async (targetChatId = null) => {
    try {
        const https = require('https');
        
        // Use a stable version query so we don't bust cache unnecessarily unless actually needed.
        // We will push the global menu button properly.
        const url = \`\${WEB_APP_URL}/index.html?v=1.3\`;`;

serverJs = serverJs.replace(menuBtnRegex, menuBtnReplacement);


fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Successfully patched server.js for data persistence and auto-update!");
