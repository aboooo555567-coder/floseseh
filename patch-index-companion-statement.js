const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add "مشهد مراجعة لمرافق 📋" to FAB menu
const fabRegex = /(<div class="fab-menu-item" onclick="app\.startForm\('companion'\)">\s*مرافقة مريض 👥\s*<\/div>)/s;
const fabReplacement = `<div class="fab-menu-item" onclick="app.startForm('companion_statement')">
                        مشهد مراجعة لمرافق 📋
                    </div>
                    $1`;
html = html.replace(fabRegex, fabReplacement);

// 2. Add times and waiting period instead of duration
const datesRowRegex = /(<div class="dates-row">\s*<div class="form-group half">\s*<label>تاريخ الدخول<\/label>\s*<input type="date" id="admission_date" required>\s*<\/div>\s*<div class="form-group half">\s*<label>تاريخ الخروج<\/label>\s*<input type="date" id="discharge_date" required>\s*<\/div>\s*<\/div>\s*)(<div class="form-group">\s*<label>مدة الإجازة \(بالأيام\)<\/label>\s*<input type="number" id="duration" value="1" min="1" required>\s*<\/div>)/s;

const newInputs = `$1
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
                    </div>
`;
html = html.replace(datesRowRegex, newInputs);

// 3. Add Visit Type to Patient Info section
const employerRegex = /(<div class="form-group">\s*<label>جهة العمل<\/label>\s*<input type="text" id="employer" placeholder="اسم الجهة">\s*<\/div>)/s;
const visitTypeInputs = `$1

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
`;
html = html.replace(employerRegex, visitTypeInputs);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated index.html for Companion Statement");
