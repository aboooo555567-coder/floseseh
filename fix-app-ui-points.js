const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const regexUI = /if \(this\.state\.subscriptionDays > 0\) {[\s\S]*?subBadge\.innerText = '[^']+';\s*subBadge\.style\.color = '#e74c3c';\s*}/;

const newUI = `if (this.state.subscriptionDays > 0) {
            subBadge.innerText = \`اشتراك لامحدود - متبقي \${this.state.subscriptionDays} يوم\`;
            subBadge.style.color = '#009688';
        } else if (this.state.points >= 5) {
            subBadge.innerText = \`اشتراك بالنقاط - متبقي \${Math.floor(this.state.points / 5)} تقرير\`;
            subBadge.style.color = '#009688';
        } else {
            subBadge.innerText = 'لا يوجد اشتراك فعال';
            subBadge.style.color = '#e74c3c';
        }`;

appJs = appJs.replace(regexUI, newUI);
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed updateDashboardUI to show points based subscription');
