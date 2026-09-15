const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Inject Admin Menu Item
const oldFab = `<div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>
                </div>`;
const newFab = `<div class="fab-menu-item" onclick="app.startForm('sickleave')">
                        إجازة مرضية 🤒
                    </div>
                    <div class="fab-menu-item" id="admin-fab-item" style="display:none;" onclick="app.navigate('admin')">
                        إضافة مشتركين 👑
                    </div>
                </div>`;
html = html.replace(oldFab, newFab);
if (!html.includes('admin-fab-item')) {
    // try different encoding if not matched
    const fallbackOld = `<div class="fab-menu-item" onclick="app.startForm('sickleave')">`;
    // We'll just regex insert it before </div> </div>
    html = html.replace(/<div class="fab-menu-item" onclick="app\.startForm\('sickleave'\)">\s*[^<]*\s*<\/div>\s*<\/div>/, 
    `$&`.replace('</div>\n                </div>', `</div>\n                    <div class="fab-menu-item" id="admin-fab-item" style="display:none;" onclick="app.navigate('admin')">\n                        إضافة مشتركين 👑\n                    </div>\n                </div>`));
}

// Ensure it replaced
if (!html.includes('admin-fab-item')) {
   // manual insert
   html = html.replace(/(<div class="fab-menu-item" onclick="app\.startForm\('sickleave'\)">[\s\S]*?<\/div>)/, '$1\n                    <div class="fab-menu-item" id="admin-fab-item" style="display:none;" onclick="app.navigate(\'admin\')">\n                        إضافة مشتركين 👑\n                    </div>');
}

// Inject Admin Screen Section
const adminScreen = `
        <!-- Admin Screen -->
        <section id="admin-screen" class="screen">
            <header class="app-header">
                <h2>إدارة المشتركين</h2>
                <button class="btn-back" onclick="app.navigate('dashboard')">🔙</button>
            </header>
            <main class="form-container" style="padding:20px;">
                <div class="form-group">
                    <label>ايدي المشترك (Chat ID)</label>
                    <input type="number" id="admin_chat_id" placeholder="مثال: 123456789" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                </div>
                <div class="form-group">
                    <label>المدة (بالأيام)</label>
                    <input type="number" id="admin_days" value="30" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                </div>
                <div class="form-group">
                    <label>عدد النقاط</label>
                    <input type="number" id="admin_points" value="10" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                </div>
                <button class="btn-primary" onclick="app.addSubscriber()" style="width:100%; margin-top:20px; font-size:16px;">إضافة / تفعيل</button>
            </main>
        </section>
`;

if (!html.includes('admin-screen')) {
    html = html.replace('<!-- Packages Screen -->', adminScreen + '\n        <!-- Packages Screen -->');
}

// Cache bust app.js again
html = html.replace(/app\.js\?v=\d+/g, 'app.js?v=' + Math.floor(Math.random() * 1000));

fs.writeFileSync('index.html', html, 'utf8');
console.log('Modified index.html');
