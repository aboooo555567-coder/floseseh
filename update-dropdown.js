const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Find the leave_type form group and replace it
const searchString1 = `<label>نوع الإجازة</label>`;
const replaceString1 = `<label>نوع التقرير</label>`;

// I will use regex to replace the select options to just GSL and PSL
const regexOptions = /<select id="leave_type" required>[\s\S]*?<\/select>/;
const newSelect = `<select id="leave_type" required style="border-color: var(--primary); border-radius: 12px; padding: 16px; font-weight: bold; font-size: 16px;">
                            <option value="GSL">GSL</option>
                            <option value="PSL">PSL</option>
                        </select>`;

html = html.replace(searchString1, replaceString1);
html = html.replace(regexOptions, newSelect);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated report type dropdown in index.html");
