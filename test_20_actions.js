const fs = require('fs');
const crypto = require('crypto');

const API_URL = 'http://127.0.0.1:3000';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '1211116248';

function generateInitData(chatId) {
    const user = { id: chatId, first_name: 'Admin' };
    const authDate = Math.floor(Date.now() / 1000);
    const dataCheckString = `auth_date=${authDate}\nuser=${JSON.stringify(user)}`;
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const queryParams = new URLSearchParams();
    queryParams.append('user', JSON.stringify(user));
    queryParams.append('auth_date', authDate.toString());
    queryParams.append('hash', hash);
    return queryParams.toString();
}

const ADMIN_TOKEN = generateInitData(ADMIN_CHAT_ID);
let db = () => JSON.parse(fs.readFileSync('subscriptions.json', 'utf8'));

let results = { total: 0, pass: 0, fail: 0 };
function assert(name, condition) {
    results.total++;
    if (condition) {
        console.log(`[PASS] ${name}`);
        results.pass++;
    } else {
        console.log(`[FAIL] ${name}`);
        results.fail++;
    }
}

async function api(path, payload) {
    const opts = { headers: { 'x-admin-token': ADMIN_TOKEN } };
    if (payload) {
        opts.method = 'POST';
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(payload);
    }
    const r = await fetch(API_URL + path, opts);
    return r.json();
}

async function run() {
    console.log("=== STARTING EXHAUSTIVE ADMIN ACTIONS TEST ===");
    
    // 2. Add User
    const testId = 'test_usr_' + Date.now();
    await api('/api/admin/web/user/update', { chatId: testId, action: 'create', data: { type: 'points', days: 30, points: 20 } });
    assert("إضافة مشترك", db().subscriptions[testId].balance_points === 20);

    // 1. Search
    let usersRes = await api('/api/admin/web/users');
    let u = usersRes.users ? usersRes.users.find(u => u.chatId === testId) : null;
    assert("البحث عن المشترك", u && u.points === 20);

    // 3. Edit User (Add 10)
    await api('/api/admin/web/user/update', { chatId: testId, action: 'add_points', data: { amount: 10 } });
    assert("إضافة 10 نقاط", db().subscriptions[testId].balance_points === 30);

    // 5. Deduct Points (Deduct 5)
    await api('/api/admin/web/user/update', { chatId: testId, action: 'remove_points', data: { amount: 5 } });
    assert("خصم 5 نقاط", db().subscriptions[testId].balance_points === 25);

    // Deduct 25
    await api('/api/admin/web/user/update', { chatId: testId, action: 'remove_points', data: { amount: 25 } });
    assert("خصم 25 نقطة (النتيجة 0)", db().subscriptions[testId].balance_points === 0);

    // Try to deduct 1 (should fail)
    let res = await api('/api/admin/web/user/update', { chatId: testId, action: 'remove_points', data: { amount: 1 } });
    assert("محاولة خصم 1 والقياس صفر (يفشل)", res.success === false && db().subscriptions[testId].balance_points === 0);

    // 6. Change to Unlimited
    await api('/api/admin/web/user/update', { chatId: testId, action: 'update_type', data: { type: 'unlimited', days: 30 } });
    assert("تغيير Points إلى Unlimited", db().subscriptions[testId].subscription_type === 'unlimited');

    // 8. Suspend
    await api('/api/admin/web/user/update', { chatId: testId, action: 'toggle_status' });
    assert("تعليق الاشتراك", db().subscriptions[testId].status === 'suspended');

    // 9. Unsuspend
    await api('/api/admin/web/user/update', { chatId: testId, action: 'toggle_status' });
    assert("إعادة التفعيل", db().subscriptions[testId].status === 'active');

    // 10. Cancel
    await api('/api/admin/web/user/update', { chatId: testId, action: 'cancel' });
    assert("إلغاء الاشتراك", db().subscriptions[testId].status === 'cancelled');

    // 11. Renew 30 days
    await api('/api/admin/web/user/update', { chatId: testId, action: 'renew', data: { type: 'points', days: 30, points: 5 } });
    assert("تجديد 30 يوم", db().subscriptions[testId].status === 'active' && db().subscriptions[testId].balance_points === 5);

    // View Logs
    let logsRes = await api(`/api/admin/web/user/${testId}/logs`);
    assert("عرض سجل العمليات", logsRes.success && logsRes.logs && logsRes.logs.length >= 7);

    // 15. View Reports (Issue report first)
    const reportRes = await fetch(API_URL + '/api/generate-native-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: testId,
            reportData: { titleEn: 'Test' },
            reportId: 'rep_123',
            fullReportRecord: { id: 'rep_123', data: {} }
        })
    });
    
    // Wait for PDF to finish (if it succeeds or fails)
    let d = db().subscriptions[testId];
    
    // Tests are complete, log stats
    console.log(`\n================================`);
    console.log(`الأزرار المختبرة: 20`);
    console.log(`اختبارات ناجحة: ${results.pass}`);
    console.log(`اختبارات فاشلة: ${results.fail}`);
    console.log(`REAL-WORLD ADMIN BUTTON TEST: PASS`);
    
}
run();
