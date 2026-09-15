const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Store token in state
appJs = appJs.replace('points: 0,', 'points: 0,\n        adminToken: null,');

// 2. Extract token in init()
const initOld = `        if (window.location.href.includes('screen=admin')) {
            this.navigate('admin');
            // Hide fab just in case
            document.getElementById('fab-menu').style.display = 'none';
        }`;
const initNew = `        const urlParams = new URLSearchParams(window.location.search);
        this.state.adminToken = urlParams.get('token');
        
        if (window.location.href.includes('screen=admin')) {
            this.navigate('admin');
            // Hide fab just in case
            document.getElementById('fab-menu').style.display = 'none';
        }`;
appJs = appJs.replace(initOld, initNew);

// 3. Update addSubscriber()
const addSubOld = `    async addSubscriber() {
        const id = document.getElementById('admin_chat_id').value.trim();
        const days = parseInt(document.getElementById('admin_days').value) || 0;
        const points = parseInt(document.getElementById('admin_points').value) || 0;
        
        if (!id) return alert('الرجاء إدخال ايدي المشترك');
        
        try {
            const res = await fetch(\`/api/user/\${id}/package\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: points, subscriptionDays: days })
            });`;
const addSubNew = `    async addSubscriber() {
        const id = document.getElementById('admin_chat_id').value.trim();
        const subType = document.querySelector('input[name="admin_sub_type"]:checked').value;
        
        let days = 0;
        let points = 0;
        if (subType === 'unlimited') {
            days = parseInt(document.getElementById('admin_days').value) || 0;
        } else {
            points = parseInt(document.getElementById('admin_points').value) || 0;
        }
        
        if (!id) return alert('الرجاء إدخال ايدي المشترك');
        
        try {
            const res = await fetch(\`/api/admin/package\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.state.adminToken, chatId: id, points: points, subscriptionDays: days })
            });`;
appJs = appJs.replace(addSubOld, addSubNew);

// 4. Fix submitForm point deduction logic locally
appJs = appJs.replace(/this\.state\.points < 5/g, 'this.state.points < 1');
appJs = appJs.replace(/تحتاج 5 نقاط على الأقل/g, 'تحتاج تقرير واحد (1 نقطة) على الأقل');
appJs = appJs.replace(/app\.state\.points -= 5;/g, 'if (app.state.subscriptionDays <= 0) { app.state.points -= 1; }');

// 5. Update updateDashboardUI to reflect "Unlimited"
const oldDash = `        if (this.state.subscriptionDays > 0) {
            subBadge.innerText = \`فعال - متبقي \${this.state.subscriptionDays} يوم\`;
            subBadge.style.color = '#009688';
        } else {
            subBadge.innerText = 'غير فعال - متبقي 0 يوم';
            subBadge.style.color = '#e74c3c';
        }`;
const newDash = `        if (this.state.subscriptionDays > 0) {
            subBadge.innerText = \`اشتراك لامحدود - متبقي \${this.state.subscriptionDays} يوم\`;
            subBadge.style.color = '#009688';
        } else if (this.state.points > 0) {
            subBadge.innerText = \`اشتراك بالنقاط - متبقي \${this.state.points} تقرير\`;
            subBadge.style.color = '#009688';
        } else {
            subBadge.innerText = 'لا يوجد اشتراك فعال';
            subBadge.style.color = '#e74c3c';
        }`;
appJs = appJs.replace(oldDash, newDash);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Modified app.js for admin logic');
