const http = require('http');

const dataTests = [
  { leaveId: 'GSL26090112442', nationalId: '1137729768', description: 'Correct ID and National ID' },
  { leaveId: 'GSL99999999999', nationalId: '1137729768', description: 'Wrong Leave ID, Correct National ID' },
  { leaveId: 'GSL26090112442', nationalId: '0000000000', description: 'Correct Leave ID, Wrong National ID' },
  { leaveId: 'GSL99999999999', nationalId: '0000000000', description: 'Both wrong' },
];

async function runTest(testCase) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      leaveId: testCase.leaveId,
      nationalId: testCase.nationalId
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/inquiry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\nTest: ${testCase.description}`);
        console.log(`Req: { leaveId: "${testCase.leaveId}", nationalId: "${testCase.nationalId}" }`);
        console.log(`Res: ${data}`);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runAll() {
  for (const t of dataTests) {
    await runTest(t);
  }
}

runAll();
