const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const startStr = '// Ensure fonts are loaded before generating';
const endStr = 'app.navigate(\'success\');\n            } else {\n                alert("❌ حدث خطأ أثناء الإرسال: " + (sendResult.error || sendResponse.status));\n                fetch(\'/api/logs?msg=Server_Error_\' + sendResponse.status);\n            }\n        } catch(e) {';

const startIndex = js.indexOf(startStr);
const endIndex = js.indexOf(endStr, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error('Bounds not found');
    process.exit(1);
}

const before = js.slice(0, startIndex);
// The endIndex was at `app.navigate`, but we want to replace up to `catch(e) {` which is at the end of the whole block!
const catchIndex = js.indexOf('} catch(e) {', startIndex);
const after = js.slice(catchIndex);

const newLogic = `
            // SERVER-SIDE GENERATION FIX
            const res = await fetch('/api/generate-native-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: app.state.chatId,
                    reportData: reportDataPayload,
                    filename: 'sickLeaves.pdf',
                    reportId: reportId
                })
            });
            
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'فشل توليد التقرير');
            }

            // Also save report data
            await fetch(\`/api/report/\${app.state.chatId}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    report: {
                        id: reportId,
                        patientName: type === 'companion' ? escAr : pNameAr,
                        type: type,
                        issueDate: issueDate,
                        data: {
                            admission_date: admission,
                            discharge_date: discharge,
                            duration: duration,
                            issue_date: issueDate,
                            issue_time: issueTime,
                            national_id: idNum,
                            patient_name_ar: pNameAr,
                            patient_name_en: pNameEn,
                            nationality: document.getElementById('nationality').value,
                            employer: employer,
                            escort_name_ar: escAr,
                            escort_name_en: escEn,
                            relation_ar: relAr,
                            relation_en: relEn,
                            doctor_name_ar: docNameAr,
                            doctor_name_en: docNameEn,
                            job_title_ar: jobAr,
                            job_title_en: jobEn,
                            hospital_ar: hospAr,
                            hospital_en: hospEn,
                            hospital_type: document.querySelector('input[name="hospital_type"]:checked').value,
                            license_number: license
                        }
                    }
                })
            });

            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('report-form').reset();
            app.navigate('success');

        `;

fs.writeFileSync('app.js', before + newLogic + after, 'utf8');
console.log('App updated again!');
