const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. We need to replace the middle rows in the PDF table conditionally.
// Let's find the rows between "Leave ID" and "Issue Date"
const tableMiddleRegex = /(<tr class="dur-row">\s*<td class="dur-label".*?<\/tr>\s*<tr>\s*<td class="label-en">Admission Date<\/td>.*?<\/tr>\s*<tr>\s*<td class="label-en">Discharge Date<\/td>.*?<\/tr>)/s;

const tableMiddleReplacement = `\${d.type === 'companion_statement' ? \`
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
      <td style="width:202px; font-family: 'Arial', sans-serif;">\${d.waitingPeriod || ''}</td>
      <td dir="rtl" style="width:202px;">\${d.waitingPeriod || ''}</td>
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

serverJs = serverJs.replace(tableMiddleRegex, tableMiddleReplacement);

// 2. Add Visit Type at the end of the table
const tableEndRegex = /(<td class="label-ar">المسمى الوظيفى<\/td>\s*<\/tr>\s*)(<\/table>)/s;
const tableEndReplacement = `$1\${d.type === 'companion_statement' ? \`
    <tr>
      <td class="label-en">Visit Type</td>
      <td class="val">\${d.visitTypeEn || ''}</td>
      <td class="val">\${d.visitTypeAr || ''}</td>
      <td class="label-ar">نوع الزيارة</td>
    </tr>\` : ''}
$2`;
serverJs = serverJs.replace(tableEndRegex, tableEndReplacement);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Patched server.js successfully!");
