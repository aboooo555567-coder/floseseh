const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const editOld = `        const report = this.state.reports.find(r => r.id === id);
        if(!report || !report.data) {
            alert('عفواً، بيانات هذا التقرير غير متوفرة.');
            return;
        }`;

const editNew = `        const report = this.state.reports.find(r => r.id === id);
        if(!report || !report.data) {
            alert('عفواً، بيانات هذا التقرير غير متوفرة.');
            return;
        }
        
        // 2 days edit limit
        if (report.issueDate) {
            const issueDateObj = new Date(report.issueDate);
            const now = new Date();
            const diffTime = now - issueDateObj;
            if (diffTime > (2 * 24 * 60 * 60 * 1000)) {
                if (this.tg) this.tg.showAlert('عذراً، لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.');
                else alert('عذراً، لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.');
                return;
            }
        }`;

appJs = appJs.replace(editOld, editNew);

// Also fix the ID parsing bug if any.
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Modified app.js edit logic');
