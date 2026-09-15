const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const oldLogic = `    promptAdminLogin() {
        const code = prompt("أدخل الرمز السري للإدارة:");
        if (code === "ZAK-99X-ADMIN-2026") {
            this.state.adminToken = code;
            this.navigate('admin');
        } else if (code !== null) {
            alert("الرمز السري غير صحيح 🚫");
        }
    },`;

const newLogic = `    promptAdminLogin() {
        const savedToken = localStorage.getItem('sehaAdminToken');
        if (savedToken === "ZAK-99X-ADMIN-2026") {
            this.state.adminToken = savedToken;
            this.navigate('admin');
            return;
        }

        const code = prompt("أدخل الرمز السري للإدارة:");
        if (code === "ZAK-99X-ADMIN-2026") {
            this.state.adminToken = code;
            localStorage.setItem('sehaAdminToken', code);
            this.navigate('admin');
        } else if (code !== null) {
            alert("الرمز السري غير صحيح 🚫");
        }
    },`;

appJs = appJs.replace(oldLogic, newLogic);
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Modified app.js to remember admin token');
