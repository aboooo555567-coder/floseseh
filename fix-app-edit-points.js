const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Add currentReportId to state
appJs = appJs.replace(`leaveType: 'sickleave', // 'sickleave' or 'companion'`, `leaveType: 'sickleave', // 'sickleave' or 'companion'\n        currentReportId: null,`);

// 2. Clear currentReportId in startForm
const startFormOld = `    startForm(type) {
        this.toggleFab();
        this.state.leaveType = type;
        this.state.currentStep = 1;`;
const startFormNew = `    startForm(type) {
        if (document.getElementById('fab-menu').classList.contains('show') || document.querySelector('.fab-menu-items.active')) {
            this.toggleFab();
        }
        this.state.leaveType = type;
        this.state.currentStep = 1;
        this.state.currentReportId = null;`;
appJs = appJs.replace(startFormOld, startFormNew);

// 3. Set currentReportId in editReport
const editOld = `        this.startForm(report.type);
        
        // Populate fields`;
const editNew = `        this.startForm(report.type);
        this.state.currentReportId = report.id;
        
        // Populate fields`;
appJs = appJs.replace(editOld, editNew);

// 4. Use currentReportId in submitForm
const submitOldId = `const reportId = \`GSL\${Math.floor(Math.random() * 10000000000)}\`;`;
const submitNewId = `const reportId = this.state.currentReportId || \`GSL\${Math.floor(Math.random() * 10000000000)}\`;`;
appJs = appJs.replace(submitOldId, submitNewId);

// 5. Fix local point deduction to match server (5 points, and only if not update)
const oldValidation = `        if(this.state.points < 1 && this.state.subscriptionDays <= 0) {
            if(this.tg) this.tg.showAlert("تحتاج تقرير واحد (1 نقطة) على الأقل");
            else alert("تحتاج تقرير واحد (1 نقطة) على الأقل");
            return;
        }`;
const newValidation = `        if(!this.state.currentReportId && this.state.points < 5 && this.state.subscriptionDays <= 0) {
            if(this.tg) this.tg.showAlert("ليس لديك رصيد. تحتاج 5 نقاط لإصدار تقرير جديد.");
            else alert("ليس لديك رصيد. تحتاج 5 نقاط لإصدار تقرير جديد.");
            return;
        }`;
appJs = appJs.replace(oldValidation, newValidation);

const oldDeduct = `if (app.state.subscriptionDays <= 0) { app.state.points -= 1; }`;
const newDeduct = `if (!app.state.currentReportId && app.state.subscriptionDays <= 0) { app.state.points -= 5; }`;
appJs = appJs.replace(oldDeduct, newDeduct);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed editReport logic to preserve ID and not deduct points');
