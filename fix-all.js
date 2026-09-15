const fs = require('fs');

// 1. Fix app.js QR Code logic
let appJs = fs.readFileSync('app.js', 'utf8');
const shortQrCode = `
        const verifyParams = new URLSearchParams({
            id: reportId,
            nid: idNum
        });
        const verifyUrl = window.location.origin + '/seha-enquiry.html?' + verifyParams.toString();
`;
appJs = appJs.replace(/const verifyParams = new URLSearchParams\(\{[\s\S]*?\}\);\s*const verifyUrl =[^;]+;/, shortQrCode);
fs.writeFileSync('app.js', appJs, 'utf8');


// 2. Fix server.js adminUrl
let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = serverJs.replace(
    /const adminUrl = \`\$\{WEB_APP_URL_CACHED\}\/admin\.html\?token=\$\{currentAdminToken\}\`;/g,
    "const adminUrl = `${WEB_APP_URL}/admin.html?token=${currentAdminToken}&v=${Date.now()}`;"
);
serverJs = serverJs.replace(
    /const adminUrl = \`\$\{process\.env\.APP_URL \|\| 'https:\/\/seha-sickleave-app\.onrender\.com'\}\/admin\.html\?token=\$\{currentAdminToken\}\`;/,
    "const adminUrl = `${WEB_APP_URL}/admin.html?token=${currentAdminToken}&v=${Date.now()}`;"
);
fs.writeFileSync('server.js', serverJs, 'utf8');


// 3. Fix seha-enquiry.html
let html = fs.readFileSync('seha-enquiry.html', 'utf8');
const newLogic = `
        document.getElementById('enquiryForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading animation
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'جاري التحقق...';
            btn.style.opacity = '0.7';
            
            const idVal = document.getElementById('serviceCode').value;
            const nidVal = document.getElementById('nationalId').value;

            try {
                const res = await fetch(\`/api/verify?id=\${idVal}&nid=\${nidVal}\`);
                const data = await res.json();
                
                btn.innerText = originalText;
                btn.style.opacity = '1';

                if (data.success && data.report) {
                    const r = data.report;
                    document.getElementById('resName').innerText = r.patientName || 'غير متوفر';
                    document.getElementById('resNid').innerText = nidVal;
                    document.getElementById('resDur').innerText = (r.data.duration || '-') + ' أيام / يوم';
                    document.getElementById('resDate').innerText = r.issueDate || '-';
                    document.getElementById('resHosp').innerText = r.data.hospital_ar || '-';
                    document.getElementById('resDoc').innerText = (r.data.doctor_name_ar || '-') + (r.data.job_title_ar ? ' (' + r.data.job_title_ar + ')' : '');
                    
                    document.getElementById('formContainer').style.display = 'none';
                    document.getElementById('resultBox').style.display = 'block';
                } else {
                    alert('عفواً، لا يوجد تقرير بهذا الرقم أو الهوية.');
                }
            } catch (err) {
                btn.innerText = originalText;
                btn.style.opacity = '1';
                alert('عفواً، لا يوجد تقرير بهذا الرقم أو الهوية.');
            }
        });
`;
html = html.replace(/document\.getElementById\('enquiryForm'\)\.addEventListener\('submit', function\(e\) \{[\s\S]*?\}\);/, newLogic.trim());
fs.writeFileSync('seha-enquiry.html', html, 'utf8');


// 4. Cache bust index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/app\.js\?v=\d+/g, 'app.js?v=39');
fs.writeFileSync('index.html', indexHtml, 'utf8');

console.log('All files fixed!');
