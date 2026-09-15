const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const adminCheckCode = `// Check admin
        const tgUser = this.tg?.initDataUnsafe?.user;
        if (tgUser && (tgUser.username?.toLowerCase() === 'zakaria_2025' || tgUser.username?.toLowerCase() === 'zakmmm_1211' || tgUser.id == 1572911145 || tgUser.id == 823439063 || tgUser.id == 123456789)) {
            const adminFab = document.getElementById('admin-fab-item');
            if (adminFab) adminFab.style.display = 'block';
        }`;

appJs = appJs.replace(adminCheckCode, '');

const urlParseLogic = `
        const urlParams = new URLSearchParams(window.location.search);
        const startScreen = urlParams.get('screen');
        if (startScreen) {
            this.navigate(startScreen);
        }
`;

appJs = appJs.replace('this.updateDashboardUI();', 'this.updateDashboardUI();\n' + urlParseLogic);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Modified app.js init logic');
