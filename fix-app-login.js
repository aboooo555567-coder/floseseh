const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const logicToAdd = `
    promptAdminLogin() {
        const code = prompt("أدخل الرمز السري للإدارة:");
        if (code === "ZAK-99X-ADMIN-2026") {
            this.state.adminToken = code;
            this.navigate('admin');
        } else if (code !== null) {
            alert("الرمز السري غير صحيح 🚫");
        }
    },
`;

appJs = appJs.replace('navigate(screenId) {', logicToAdd + '\n    navigate(screenId) {');

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Added promptAdminLogin to app.js');
