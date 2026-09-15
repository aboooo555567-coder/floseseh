const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const regex = /if\(this\.state\.points < 1 && this\.state\.subscriptionDays <= 0\) {[\s\S]*?return;\s*}/;
const newValidation = `if(!this.state.currentReportId && this.state.points < 5 && this.state.subscriptionDays <= 0) {
            if(this.tg) this.tg.showAlert("ليس لديك رصيد. تحتاج 5 نقاط لإصدار تقرير جديد.");
            else alert("ليس لديك رصيد. تحتاج 5 نقاط لإصدار تقرير جديد.");
            return;
        }`;

appJs = appJs.replace(regex, newValidation);
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed validation regex replace');
