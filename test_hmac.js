const crypto = require('crypto');
const TOKEN = 'REMOVED_TOKEN';

function generateInitData(chatId) {
    const user = { id: chatId, first_name: "Admin" };
    const authDate = Math.floor(Date.now() / 1000);
    const dataCheckString = `auth_date=${authDate}\nuser=${JSON.stringify(user)}`;
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    const queryParams = new URLSearchParams();
    queryParams.append('user', JSON.stringify(user));
    queryParams.append('auth_date', authDate.toString());
    queryParams.append('hash', hash);
    return queryParams.toString();
}

const adminInitData = generateInitData('1511222955');
console.log('adminInitData:', adminInitData);

function verifyTelegramWebData(initData) {
    if (!initData) return false;
    try {
        const q = new URLSearchParams(initData);
        const hash = q.get('hash');
        q.delete('hash');
        
        const keys = Array.from(q.keys());
        keys.sort();
        const dataCheckString = keys.map(k => `${k}=${q.get(k)}`).join('\n');
        
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        
        console.log('Server Hash:', computedHash);
        console.log('Client Hash:', hash);
        return computedHash === hash;
    } catch(e) { return false; }
}

console.log('Match?', verifyTelegramWebData(adminInitData));

