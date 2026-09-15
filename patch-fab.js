const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldFab = `<div class="fab-menu-items" id="fab-menu-items">
                    <div class="fab-menu-item" onclick="app.startForm('companion_statement')">
                        مشهد مراجعة لمرافق 📋
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('companion')">
                        مرافقة مريض 👥
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>
                    
                </div>`;
                
const newFab = `<div class="fab-menu-items" id="fab-menu-items">
                    <div class="fab-menu-item" onclick="app.startForm('companion_statement')">
                        مشهد مراجعة لمرافق 📋
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>
                    <div class="fab-menu-item" onclick="app.startForm('companion')">
                        مرافقة مريض 👥
                    </div>
                </div>`;

html = html.replace(/<div class="fab-menu-items" id="fab-menu-items">.*?<\/div>\s*<\/div>\s*<div class="overlay"/s, newFab + '\n            </div>\n            <div class="overlay"');

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated FAB menu order!");
