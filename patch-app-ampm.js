const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const formatAmPmAr = `
    formatAMPM_Ar(timeStr) {
        if(!timeStr) return "";
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        let ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return \`\${hours}:\${minutes} \${ampm}\`;
    },
    
    formatAMPM`;

appJs = appJs.replace(/formatAMPM/, formatAmPmAr);

const newFormat = `
        const admTimeFormatted = this.formatAMPM(admTime);
        const disTimeFormatted = this.formatAMPM(disTime);
        const admTimeFormattedAr = this.formatAMPM_Ar(admTime);
        const disTimeFormattedAr = this.formatAMPM_Ar(disTime);
`;
appJs = appJs.replace(/const admTimeFormatted = this\.formatAMPM\(admTime\);\s*const disTimeFormatted = this\.formatAMPM\(disTime\);/s, newFormat);

appJs = appJs.replace(/admissionTime: admTimeFormatted,/g, "admissionTime: admTimeFormatted,\n            admissionTimeAr: admTimeFormattedAr,");
appJs = appJs.replace(/dischargeTime: disTimeFormatted,/g, "dischargeTime: disTimeFormatted,\n            dischargeTimeAr: disTimeFormattedAr,");

fs.writeFileSync('app.js', appJs, 'utf8');
console.log("Patched app.js for Arabic AM/PM!");
