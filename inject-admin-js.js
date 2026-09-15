const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const addSubscriberFunc = `
    async addSubscriber() {
        const id = document.getElementById('admin_chat_id').value.trim();
        const days = parseInt(document.getElementById('admin_days').value) || 0;
        const points = parseInt(document.getElementById('admin_points').value) || 0;
        
        if (!id) return alert('الرجاء إدخال ايدي المشترك');
        
        try {
            const res = await fetch(\`/api/user/\${id}/package\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: points, subscriptionDays: days })
            });
            const data = await res.json();
            if (data.success) {
                alert(\`تم تفعيل المشترك بنجاح!\\nالرصيد الحالي: \${data.points} تقرير\\nأيام الاشتراك: \${data.subscriptionDays} يوم\`);
                document.getElementById('admin_chat_id').value = '';
                this.navigate('dashboard');
            } else {
                alert('خطأ: ' + data.error);
            }
        } catch (e) {
            alert('حدث خطأ في الاتصال: ' + e.message);
        }
    },
`;

if (!appJs.includes('addSubscriber()')) {
    appJs = appJs.replace('toggleFab() {', addSubscriberFunc + '\n    toggleFab() {');
}

// Check admin
const adminCheck = `
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && (tgUser.username?.toLowerCase() === 'zakaria_2025' || tgUser.username?.toLowerCase() === 'zakmmm_1211' || tgUser.id == 1572911145 || tgUser.id == 823439063)) {
            const adminFab = document.getElementById('admin-fab-item');
            if (adminFab) adminFab.style.display = 'block';
        }
`;

if (!appJs.includes('admin-fab-item')) {
    appJs = appJs.replace('this.loadDashboard();', 'this.loadDashboard();\n' + adminCheck);
}

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Modified app.js');
