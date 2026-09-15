const fs = require('fs');

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
console.log('Fixed seha-enquiry.html');
