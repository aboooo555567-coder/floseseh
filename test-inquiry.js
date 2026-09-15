const fs = require('fs');

async function loadLocalSubscriptions() {
    const data = fs.readFileSync('subscriptions.json', 'utf-8');
    return JSON.parse(data);
}

async function testInquiry(leaveId, nationalId) {
    console.log(\`\nTesting: leaveId='\${leaveId}', nationalId='\${nationalId}'\`);
    
    const rawLeaveId = leaveId;
    const rawNationalId = nationalId;
    
    const lId = String(rawLeaveId).trim();
    const nId = String(rawNationalId).trim();

    if (!lId || !nId) {
        console.log({ success: false, error: 'الرجاء إدخال الرمز ورقم الهوية.' });
        return;
    }

    const data = await loadLocalSubscriptions();
    
    let foundLeaveIdMatch = false;
    let foundReport = null;
    
    for (const chatId in data.subscriptions) {
        const sub = data.subscriptions[chatId];
        if (sub.reports && Array.isArray(sub.reports)) {
            for (const r of sub.reports) {
                if (r.id === lId) {
                    foundLeaveIdMatch = true;
                    const storedNationalId = r.data && r.data.national_id ? String(r.data.national_id).trim() : '';
                    if (storedNationalId === nId) {
                        foundReport = r;
                        break;
                    }
                }
            }
        }
        if (foundReport) break;
    }

    if (foundReport) {
        console.log({ success: true, report: foundReport });
    } else if (foundLeaveIdMatch) {
        console.log({ success: false, error: 'بيانات الاستعلام غير متطابقة.' });
    } else {
        console.log({ success: false, error: 'لم يتم العثور على إجازة بهذا الرمز.' });
    }
}

async function runTests() {
    // 1. Correct IDs
    await testInquiry('GSL26090112442', '1137729768');
    
    // 2. Wrong Leave ID, Correct National ID
    await testInquiry('GSL999', '1137729768');
    
    // 3. Correct Leave ID, Wrong National ID
    await testInquiry('GSL26090112442', '000000000');
    
    // 4. Both wrong
    await testInquiry('XYZ', '123');
}

runTests();
