const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Update populatePdfAndGenerate payload
// Find where the payload is constructed
const payloadStart = "const reportDataPayload = {";

// Add new variables before the payload
const newVars = `
        const typeIsStatement = type === 'companion_statement';
        const typeIsCompanion = type === 'companion' || type === 'companion_statement';
        
        const admTime = document.getElementById('admission_time') ? document.getElementById('admission_time').value : '';
        const disTime = document.getElementById('discharge_time') ? document.getElementById('discharge_time').value : '';
        const waitingPeriod = document.getElementById('waiting_period') ? document.getElementById('waiting_period').value : '';
        const visitAr = document.getElementById('visit_type_ar') ? document.getElementById('visit_type_ar').value : '';
        const visitEn = document.getElementById('visit_type_en') ? document.getElementById('visit_type_en').value : '';

        const admTimeFormatted = this.formatAMPM(admTime);
        const disTimeFormatted = this.formatAMPM(disTime);
`;

appJs = appJs.replace(/(const escAr = type === 'companion'.*?const relEn = type === 'companion'.*?;)/s, `$1\n${newVars}`);

// Replace `type === 'companion'` with `typeIsCompanion` for escort fields inside populatePdfAndGenerate
appJs = appJs.replace(/type === 'companion' \? document\.getElementById\('escort_name_ar'\)\.value : ''/g, "typeIsCompanion ? document.getElementById('escort_name_ar').value : ''");
appJs = appJs.replace(/type === 'companion' \? document\.getElementById\('escort_name_en'\)\.value : ''/g, "typeIsCompanion ? document.getElementById('escort_name_en').value : ''");
appJs = appJs.replace(/type === 'companion' \? document\.getElementById\('relation_ar'\)\.value : ''/g, "typeIsCompanion ? document.getElementById('relation_ar').value : ''");
appJs = appJs.replace(/type === 'companion' \? document\.getElementById\('relation_en'\)\.value : ''/g, "typeIsCompanion ? document.getElementById('relation_en').value : ''");


const reportDataRegex = /const reportDataPayload = \{([\s\S]*?)\};/s;
appJs = appJs.replace(reportDataRegex, (match, p1) => {
    let replaced = p1;
    // Replace title logic
    replaced = replaced.replace(/titleAr: type === 'companion' \? 'تقرير مرافقة مريض' : 'تقرير إجازة مرضية',/, 
        "titleAr: type === 'companion_statement' ? 'مشهد مراجعة لمرافق' : (type === 'companion' ? 'تقرير مرافقة مريض' : 'تقرير إجازة مرضية'),");
    replaced = replaced.replace(/titleEn: type === 'companion' \? 'Patient Companion Report' : 'Sick Leave Report',/,
        "titleEn: type === 'companion_statement' ? 'Companion Statement of Visit' : (type === 'companion' ? 'Patient Companion Report' : 'Sick Leave Report'),");
    
    // Replace names logic
    replaced = replaced.replace(/nameLabelEn: type === 'companion' \? 'Companion Name' : 'Name',/,
        "nameLabelEn: typeIsCompanion ? 'Companion Name' : 'Name',");
    replaced = replaced.replace(/nameLabelAr: type === 'companion' \? 'اسم المرافق' : 'الاسم',/,
        "nameLabelAr: typeIsCompanion ? 'اسم المرافق' : 'الاسم',");
    replaced = replaced.replace(/nameEn: type === 'companion' \? escEn\.toUpperCase\(\) : pNameEn\.toUpperCase\(\),/,
        "nameEn: typeIsCompanion ? escEn.toUpperCase() : pNameEn.toUpperCase(),");
    replaced = replaced.replace(/nameAr: type === 'companion' \? escAr : pNameAr,/,
        "nameAr: typeIsCompanion ? escAr : pNameAr,");
    replaced = replaced.replace(/relationEn: type === 'companion' \? relEn : '',/,
        "relationEn: typeIsCompanion ? relEn : '',");
    replaced = replaced.replace(/relationAr: type === 'companion' \? relAr : '',/,
        "relationAr: typeIsCompanion ? relAr : '',");
        
    replaced = replaced.replace(/docLabelEn: type === 'companion' \? 'Physician Name' : 'Practitioner Name',/,
        "docLabelEn: type === 'companion' ? 'Physician Name' : 'Practitioner Name',");
    replaced = replaced.replace(/docLabelAr: type === 'companion' \? 'اسم الطبيب' : 'اسم الممارس',/,
        "docLabelAr: type === 'companion' ? 'اسم الطبيب' : 'اسم الممارس',");

    // Add new fields at the end
    replaced += `\n            type: type,
            admissionTime: admTimeFormatted,
            dischargeTime: disTimeFormatted,
            waitingPeriod: waitingPeriod,
            visitTypeAr: visitAr,
            visitTypeEn: visitEn`;
            
    return `const reportDataPayload = {${replaced}};`;
});

fs.writeFileSync('app.js', appJs, 'utf8');
console.log("Patched app.js successfully!");
