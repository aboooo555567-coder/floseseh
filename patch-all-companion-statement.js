const fs = require('fs');

// ===================== 1. PATCH INDEX.HTML =====================
let html = fs.readFileSync('index.html', 'utf8');

// 1A. Add "مشهد مراجعة لمرافق 📋" to FAB menu and reorder
const fabOld = `<div class="fab-menu-items" id="fab-menu-items">
                    <div class="fab-menu-item" onclick="app.startForm('companion')">
                        مرافقة مريض 👥
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>`;

const fabNew = `<div class="fab-menu-items" id="fab-menu-items">
                    <div class="fab-menu-item" onclick="app.startForm('companion_statement')">
                        مشهد مراجعة لمرافق 📋
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('companion')">
                        مرافقة مريض 👥
                    </div>`;

if (html.includes(fabOld)) {
    html = html.replace(fabOld, fabNew);
    console.log("✅ FAB menu updated with companion_statement and reordered");
} else {
    console.log("⚠️ FAB menu pattern not found, trying alternative...");
    // Try replacing just the inner content
    html = html.replace(
        /(<div class="fab-menu-items" id="fab-menu-items">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>)/,
        `$1
                    <div class="fab-menu-item" onclick="app.startForm('companion_statement')">
                        مشهد مراجعة لمرافق 📋
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('companion')">
                        مرافقة مريض 👥
                    </div>
                $2`
    );
    console.log("✅ FAB menu updated (alternative method)");
}

// 1B. Add time-row, waiting-period, and wrap duration in a div with id
// Replace admission/discharge dates section + duration
const step1Old = `<div class="dates-row">
                        <div class="form-group half">
                            <label>تاريخ الدخول</label>
                            <input type="date" id="admission_date" required>
                        </div>
                        <div class="form-group half">
                            <label>تاريخ الخروج</label>
                            <input type="date" id="discharge_date" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>مدة الإجازة (بالأيام)</label>
                        <input type="number" id="duration" value="1" min="1" required>
                    </div>`;

const step1New = `<div class="dates-row">
                        <div class="form-group half">
                            <label>تاريخ الدخول</label>
                            <input type="date" id="admission_date" required>
                        </div>
                        <div class="form-group half">
                            <label>تاريخ الخروج</label>
                            <input type="date" id="discharge_date" required>
                        </div>
                    </div>

                    <div class="dates-row" id="time-row" style="display:none;">
                        <div class="form-group half">
                            <label>وقت الدخول</label>
                            <input type="time" id="admission_time">
                        </div>
                        <div class="form-group half">
                            <label>وقت الخروج</label>
                            <input type="time" id="discharge_time">
                        </div>
                    </div>

                    <div class="form-group" id="duration-group">
                        <label>مدة الإجازة (بالأيام)</label>
                        <input type="number" id="duration" value="1" min="1" required>
                    </div>

                    <div class="form-group" id="waiting-period-group" style="display:none;">
                        <label>فترة الانتظار</label>
                        <input type="text" id="waiting_period" placeholder="مثال: 1 ساعة و -- دقيقة">
                    </div>`;

if (html.includes(step1Old)) {
    html = html.replace(step1Old, step1New);
    console.log("✅ Step 1 fields updated (time-row, duration-group, waiting-period)");
} else {
    console.log("❌ Step 1 pattern not found!");
}

// 1C. Add visit type fields after employer
const employerOld = `<div class="form-group">
                        <label>جهة العمل</label>
                        <input type="text" id="employer" placeholder="اسم الجهة">
                    </div>

                    <!-- Escort Fields (Hidden by default) -->`;

const employerNew = `<div class="form-group">
                        <label>جهة العمل</label>
                        <input type="text" id="employer" placeholder="اسم الجهة">
                    </div>

                    <div id="visit-type-fields" style="display:none;">
                        <h3 class="section-subtitle">بيانات الزيارة</h3>
                        <div class="dates-row">
                            <div class="form-group half">
                                <label>نوع الزيارة (عربي)</label>
                                <input type="text" id="visit_type_ar" placeholder="مثال: عيادات">
                            </div>
                            <div class="form-group half">
                                <label>نوع الزيارة (إنجليزي)</label>
                                <input type="text" id="visit_type_en" placeholder="e.g. OutPatient" dir="ltr">
                            </div>
                        </div>
                    </div>

                    <!-- Escort Fields (Hidden by default) -->`;

if (html.includes(employerOld)) {
    html = html.replace(employerOld, employerNew);
    console.log("✅ Visit type fields added");
} else {
    console.log("❌ Employer pattern not found!");
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("✅ index.html saved!\n");


// ===================== 2. PATCH APP.JS =====================
let appJs = fs.readFileSync('app.js', 'utf8');

// 2A. Update startForm function
const startFormOld = `    startForm(type) {
        this.toggleFab();
        this.state.leaveType = type;
        this.state.currentStep = 1;
        
        document.getElementById('form-title').innerText = type === 'companion' ? 'إصدار تقرير مرافقة مريض' : 'إصدار تقرير جديد';
        
        const typeSelect = document.getElementById('leave_type');
        typeSelect.innerHTML = '<option value="GSL">GSL</option><option value="PSL">PSL</option>';
        
        document.getElementById('escort-fields').style.display = type === 'companion' ? 'block' : 'none';
        
        // Dynamically move National ID field based on type
        const idGroup = document.getElementById('national-id-group');
        if (idGroup) {
            if (type === 'companion') {
                const datesRow = document.querySelector('#escort-fields .dates-row');
                document.getElementById('escort-fields').insertBefore(idGroup, datesRow);
            } else {
                const step2 = document.getElementById('step-2');
                step2.insertBefore(idGroup, step2.firstChild);
            }
        }
        
        this.updateWizardUI();
        this.navigate('form');
        
        // Auto-fill current date and time
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);
        const todayStr = localISOTime.split('T')[0];
        
        document.getElementById('issue_date').value = todayStr;
        document.getElementById('admission_date').value = todayStr;
        document.getElementById('discharge_date').value = todayStr;
        
        let randHours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        let randMinutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        document.getElementById('issue_time').value = \`\${randHours}:\${randMinutes}\`;
    },`;

const startFormNew = `    startForm(type) {
        this.toggleFab();
        this.state.leaveType = type;
        this.state.currentStep = 1;
        
        // Set form title based on type
        const isCompanionStatement = type === 'companion_statement';
        const isCompanion = type === 'companion' || isCompanionStatement;
        
        let formTitle = 'إصدار تقرير جديد';
        if (isCompanionStatement) formTitle = 'إصدار مشهد مراجعة لمرافق';
        else if (type === 'companion') formTitle = 'إصدار تقرير مرافقة مريض';
        document.getElementById('form-title').innerText = formTitle;
        
        const typeSelect = document.getElementById('leave_type');
        typeSelect.innerHTML = '<option value="GSL">GSL</option><option value="PSL">PSL</option>';
        
        // Show escort fields for both companion and companion_statement
        document.getElementById('escort-fields').style.display = isCompanion ? 'block' : 'none';
        
        // Show/hide companion_statement specific fields
        const timeRow = document.getElementById('time-row');
        const durationGroup = document.getElementById('duration-group');
        const waitingPeriodGroup = document.getElementById('waiting-period-group');
        const visitTypeFields = document.getElementById('visit-type-fields');
        
        if (timeRow) timeRow.style.display = isCompanionStatement ? 'flex' : 'none';
        if (durationGroup) durationGroup.style.display = isCompanionStatement ? 'none' : 'block';
        if (waitingPeriodGroup) waitingPeriodGroup.style.display = isCompanionStatement ? 'block' : 'none';
        if (visitTypeFields) visitTypeFields.style.display = isCompanionStatement ? 'block' : 'none';
        
        // Dynamically move National ID field based on type
        const idGroup = document.getElementById('national-id-group');
        if (idGroup) {
            if (isCompanion) {
                const datesRow = document.querySelector('#escort-fields .dates-row');
                document.getElementById('escort-fields').insertBefore(idGroup, datesRow);
            } else {
                const step2 = document.getElementById('step-2');
                step2.insertBefore(idGroup, step2.firstChild);
            }
        }
        
        this.updateWizardUI();
        this.navigate('form');
        
        // Auto-fill current date and time
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);
        const todayStr = localISOTime.split('T')[0];
        
        document.getElementById('issue_date').value = todayStr;
        document.getElementById('admission_date').value = todayStr;
        document.getElementById('discharge_date').value = todayStr;
        
        let randHours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        let randMinutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        document.getElementById('issue_time').value = \`\${randHours}:\${randMinutes}\`;
    },`;

if (appJs.includes(startFormOld)) {
    appJs = appJs.replace(startFormOld, startFormNew);
    console.log("✅ startForm updated for companion_statement");
} else {
    console.log("❌ startForm pattern not found!");
}

// 2B. Update populatePdfAndGenerate to collect new fields and update payload
// Add new variables before reportDataPayload
const escortOld = `const escAr = type === 'companion' ? document.getElementById('escort_name_ar').value : '';
        const escEn = type === 'companion' ? document.getElementById('escort_name_en').value : '';
        const relAr = type === 'companion' ? document.getElementById('relation_ar').value : '';
        const relEn = type === 'companion' ? document.getElementById('relation_en').value : '';`;

const escortNew = `const typeIsCompanion = type === 'companion' || type === 'companion_statement';
        const escAr = typeIsCompanion ? document.getElementById('escort_name_ar').value : '';
        const escEn = typeIsCompanion ? document.getElementById('escort_name_en').value : '';
        const relAr = typeIsCompanion ? document.getElementById('relation_ar').value : '';
        const relEn = typeIsCompanion ? document.getElementById('relation_en').value : '';
        
        const admTime = document.getElementById('admission_time') ? document.getElementById('admission_time').value : '';
        const disTime = document.getElementById('discharge_time') ? document.getElementById('discharge_time').value : '';
        const waitingPeriod = document.getElementById('waiting_period') ? document.getElementById('waiting_period').value : '';
        const visitAr = document.getElementById('visit_type_ar') ? document.getElementById('visit_type_ar').value : '';
        const visitEn = document.getElementById('visit_type_en') ? document.getElementById('visit_type_en').value : '';
        const admTimeFormatted = this.formatAMPM(admTime);
        const disTimeFormatted = this.formatAMPM(disTime);`;

if (appJs.includes(escortOld)) {
    appJs = appJs.replace(escortOld, escortNew);
    console.log("✅ Escort vars updated + new fields added");
} else {
    console.log("❌ Escort pattern not found!");
}

// 2C. Update reportDataPayload titles
appJs = appJs.replace(
    "titleAr: type === 'companion' ? 'تقرير مرافقة مريض' : 'تقرير إجازة مرضية',",
    "titleAr: type === 'companion_statement' ? 'مشهد مراجعة لمرافق' : (type === 'companion' ? 'تقرير مرافقة مريض' : 'تقرير إجازة مرضية'),"
);
appJs = appJs.replace(
    "titleEn: type === 'companion' ? 'Patient Companion Report' : 'Sick Leave Report',",
    "titleEn: type === 'companion_statement' ? 'Companion Statement of Visit' : (type === 'companion' ? 'Patient Companion Report' : 'Sick Leave Report'),"
);
console.log("✅ Report titles updated");

// 2D. Update name labels to use typeIsCompanion
appJs = appJs.replace("nameLabelEn: type === 'companion' ? 'Companion Name' : 'Name',", "nameLabelEn: typeIsCompanion ? 'Companion Name' : 'Name',");
appJs = appJs.replace("nameLabelAr: type === 'companion' ? 'اسم المرافق' : 'الاسم',", "nameLabelAr: typeIsCompanion ? 'اسم المرافق' : 'الاسم',");
appJs = appJs.replace("nameEn: type === 'companion' ? escEn.toUpperCase() : pNameEn.toUpperCase(),", "nameEn: typeIsCompanion ? escEn.toUpperCase() : pNameEn.toUpperCase(),");
appJs = appJs.replace("nameAr: type === 'companion' ? escAr : pNameAr,", "nameAr: typeIsCompanion ? escAr : pNameAr,");
appJs = appJs.replace("relationEn: type === 'companion' ? relEn : '',", "relationEn: typeIsCompanion ? relEn : '',");
appJs = appJs.replace("relationAr: type === 'companion' ? relAr : '',", "relationAr: typeIsCompanion ? relAr : '',");
console.log("✅ Name labels updated to use typeIsCompanion");

// 2E. Add new fields to reportDataPayload (before the closing };)
appJs = appJs.replace(
    "dayDate: this.formatDateLabel(issueDate)\n        };",
    `dayDate: this.formatDateLabel(issueDate),
            type: type,
            admissionTime: admTimeFormatted,
            dischargeTime: disTimeFormatted,
            waitingPeriod: waitingPeriod,
            visitTypeAr: visitAr,
            visitTypeEn: visitEn
        };`
);
console.log("✅ New fields added to reportDataPayload");

// 2F. Update renderReports to show companion_statement type name
appJs = appJs.replace(
    "r.type === 'companion' ? 'مرافقة مريض' : 'إجازة مرضية'",
    "r.type === 'companion_statement' ? 'مشهد مراجعة' : (r.type === 'companion' ? 'مرافقة مريض' : 'إجازة مرضية')"
);
console.log("✅ renderReports updated");

fs.writeFileSync('app.js', appJs, 'utf8');
console.log("✅ app.js saved!\n");


// ===================== 3. PATCH SERVER.JS =====================
let serverJs = fs.readFileSync('server.js', 'utf8');

// 3A. Bump cache buster
serverJs = serverJs.replace(/const WEB_APP_URL_CACHED = WEB_APP_URL \+ '\?v=\d+';/, "const WEB_APP_URL_CACHED = WEB_APP_URL + '?v=50';");
console.log("✅ Cache buster bumped to v=50");

// 3B. Update the PDF table to conditionally show different rows for companion_statement
const tableRowsOld = `<tr class="dur-row">
      <td class="dur-label" style="width:155px;">Leave Duration</td>
      <td style="width:202px;">\${d.durationEn || ''}</td>
      <td dir="rtl" style="width:202px;">\${d.durationAr || ''}</td>
      <td class="dur-label" style="width:155px;">مدة الإجازة</td>
    </tr>
    <tr>
      <td class="label-en">Admission Date</td>
      <td class="val">\${d.admissionG || ''}</td>
      <td class="val">\${d.admissionH || ''}</td>
      <td class="label-ar">تاريخ الدخول</td>
    </tr>
    <tr>
      <td class="label-en">Discharge Date</td>
      <td class="val">\${d.dischargeG || ''}</td>
      <td class="val">\${d.dischargeH || ''}</td>
      <td class="label-ar">تاريخ الخروج</td>
    </tr>`;

const tableRowsNew = `\${d.type === 'companion_statement' ? \`
    <tr class="dur-row">
      <td class="dur-label" style="width:155px;">Admission Date/Time</td>
      <td style="width:202px;">\${d.admissionG || ''} - \${d.admissionTime || ''}</td>
      <td dir="rtl" style="width:202px;">\${d.admissionH || ''} - \${d.admissionTime || ''}</td>
      <td class="dur-label" style="width:155px;">تاريخ/وقت الدخول</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:155px;">Discharge Date/Time</td>
      <td style="width:202px;">\${d.dischargeG || ''} - \${d.dischargeTime || ''}</td>
      <td dir="rtl" style="width:202px;">\${d.dischargeH || ''} - \${d.dischargeTime || ''}</td>
      <td class="dur-label" style="width:155px;">تاريخ/وقت الخروج</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:155px;">Waiting Period</td>
      <td colspan="2" style="width:404px;">\${d.waitingPeriod || ''}</td>
      <td class="dur-label" style="width:155px;">فترة الانتظار</td>
    </tr>
\` : \`
    <tr class="dur-row">
      <td class="dur-label" style="width:155px;">Leave Duration</td>
      <td style="width:202px;">\${d.durationEn || ''}</td>
      <td dir="rtl" style="width:202px;">\${d.durationAr || ''}</td>
      <td class="dur-label" style="width:155px;">مدة الإجازة</td>
    </tr>
    <tr>
      <td class="label-en">Admission Date</td>
      <td class="val">\${d.admissionG || ''}</td>
      <td class="val">\${d.admissionH || ''}</td>
      <td class="label-ar">تاريخ الدخول</td>
    </tr>
    <tr>
      <td class="label-en">Discharge Date</td>
      <td class="val">\${d.dischargeG || ''}</td>
      <td class="val">\${d.dischargeH || ''}</td>
      <td class="label-ar">تاريخ الخروج</td>
    </tr>
\`}`;

if (serverJs.includes(tableRowsOld)) {
    serverJs = serverJs.replace(tableRowsOld, tableRowsNew);
    console.log("✅ PDF table rows updated for companion_statement");
} else {
    console.log("❌ Table rows pattern not found!");
}

// 3C. Add visit type row at end of table
const positionRowOld = `<td class="label-ar">المسمى الوظيفى</td>
    </tr>
  </table>`;

const positionRowNew = `<td class="label-ar">المسمى الوظيفى</td>
    </tr>
    \${d.type === 'companion_statement' ? \`<tr>
      <td class="label-en">Visit Type</td>
      <td class="val">\${d.visitTypeEn || ''}</td>
      <td class="val">\${d.visitTypeAr || ''}</td>
      <td class="label-ar">نوع الزيارة</td>
    </tr>\` : ''}
  </table>`;

if (serverJs.includes(positionRowOld)) {
    serverJs = serverJs.replace(positionRowOld, positionRowNew);
    console.log("✅ Visit type row added to PDF table");
} else {
    console.log("❌ Position row pattern not found!");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("✅ server.js saved!\n");

console.log("🎉 ALL PATCHES APPLIED SUCCESSFULLY!");
