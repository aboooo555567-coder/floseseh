const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Change employerEn to be an empty string always.
appJs = appJs.replace(
    /employerEn: employer,/g,
    'employerEn: "",'
);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed Employer alignment');
