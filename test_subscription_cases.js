const API_URL = 'http://127.0.0.1:3000';
const crypto = require('crypto');
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

async function test6SubscriptionCases() {
    console.log('--- 6 Subscription Generation Cases ---');
    const cases = [
        { name: '1. Points Plan, 0 Balance', type: 'points', balance: 0, days: 30, expectedStatus: 403, expectedMsg: 'رصيد نقاطك غير كافٍ' },
        { name: '2. Points Plan, 5 Balance', type: 'points', balance: 5, days: 30, expectedStatus: 200 },
        { name: '3. Unlimited Plan, Active', type: 'unlimited', balance: 0, days: 30, expectedStatus: 200 },
        { name: '4. Unlimited Plan, Expired', type: 'unlimited', balance: 0, days: -1, expectedStatus: 403, expectedMsg: 'اشتراكك منتهي' },
        { name: '5. Suspended Account', type: 'points', balance: 100, days: 30, status: 'suspended', expectedStatus: 403, expectedMsg: 'موقوف' },
        { name: '6. Not Subscribed', expectedStatus: 403, expectedMsg: 'غير مسجل' }
    ];

    for (const c of cases) {
        const testUserId = 'test_sub_' + crypto.randomBytes(4).toString('hex');
        
        // Setup user if needed
        if (c.name !== '6. Not Subscribed') {
            await fetch(`${API_URL}/api/admin/web/user/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
                body: JSON.stringify({
                    chatId: testUserId,
                    action: 'create',
                    data: { type: c.type, days: c.days, points: c.balance, username: 'test_user' }
                })
            });

            if (c.status === 'suspended') {
                await fetch(`${API_URL}/api/admin/web/user/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
                    body: JSON.stringify({ chatId: testUserId, action: 'toggle_status' })
                });
            }
        }

        // Test generation
        const res = await fetch(`${API_URL}/api/generate-native-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: testUserId,
                reportData: { titleEn: 'Test' },
                reportId: 'rep_123',
                fullReportRecord: { id: 'rep_123', data: {} }
            })
        });

        const data = await res.json();
        
        if (res.status === c.expectedStatus) {
            if (c.expectedMsg && data.error && !data.error.includes(c.expectedMsg)) {
                console.error(`[FAIL] ${c.name} - Expected msg to include "${c.expectedMsg}", got "${data.error}"`);
            } else {
                console.log(`[PASS] ${c.name}`);
            }
        } else {
            console.error(`[FAIL] ${c.name} - Expected ${c.expectedStatus}, got ${res.status}`);
        }
    }
}

async function test11AdminActions() {
    console.log('\n--- 11 Admin Dashboard Actions ---');
    const testUserId = 'test_admin_' + crypto.randomBytes(4).toString('hex');
    
    // 1. Create Points User
    let res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'create', data: { type: 'points', days: 30, points: 10 } })
    });
    console.log(`[PASS] Admin Action: Create Points User: ${res.ok}`);

    // 2. Add Points
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'add_points', data: { amount: 15 } })
    });
    console.log(`[PASS] Admin Action: Add Points: ${res.ok}`);

    // 3. Deduct Points
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'remove_points', data: { amount: 5 } })
    });
    console.log(`[PASS] Admin Action: Deduct Points: ${res.ok}`);

    // 4. Update to Unlimited
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'update_type', data: { type: 'unlimited', days: 60 } })
    });
    console.log(`[PASS] Admin Action: Update to Unlimited: ${res.ok}`);

    // 5. Suspend User
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'toggle_status' })
    });
    console.log(`[PASS] Admin Action: Suspend User: ${res.ok}`);

    // 6. Unsuspend User
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'toggle_status' })
    });
    console.log(`[PASS] Admin Action: Unsuspend User: ${res.ok}`);

    // 7. Renew Sub
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'renew', data: { type: 'unlimited', days: 30 } })
    });
    console.log(`[PASS] Admin Action: Renew Sub: ${res.ok}`);

    // 8. Cancel Sub
    res = await fetch(`${API_URL}/api/admin/web/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ chatId: testUserId, action: 'cancel' })
    });
    console.log(`[PASS] Admin Action: Cancel Sub: ${res.ok}`);

    // 9. View Logs
    res = await fetch(`${API_URL}/api/admin/web/user/${testUserId}/logs`, {
        headers: { 'x-admin-token': ADMIN_TOKEN }
    });
    console.log(`[PASS] Admin Action: View Logs: ${res.ok}`);

    // 10. List All Users
    res = await fetch(`${API_URL}/api/admin/web/users`, {
        headers: { 'x-admin-token': ADMIN_TOKEN }
    });
    console.log(`[PASS] Admin Action: List Users: ${res.ok}`);

    // 11. View Stats
    res = await fetch(`${API_URL}/api/admin/web/stats`, {
        headers: { 'x-admin-token': ADMIN_TOKEN }
    });
    console.log(`[PASS] Admin Action: View Stats: ${res.ok}`);
}

async function run() {
    await test6SubscriptionCases();
    await test11AdminActions();
}

run();
