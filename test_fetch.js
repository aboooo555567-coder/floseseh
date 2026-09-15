const crypto = require('crypto');
const BOT_TOKEN = 'REMOVED_TOKEN';

function generateInitData(chatId) {
    const user = { id: chatId, first_name: "Admin" };
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

async function test() {
    const adminInitData = generateInitData('1511222955');
    console.log('adminInitData:', adminInitData);
    const res = await fetch('http://localhost:3000/api/admin/web/stats', {
        headers: { 'x-admin-token': adminInitData }
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
}
test();

