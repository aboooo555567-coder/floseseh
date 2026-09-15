const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Remove promptAdminLogin and replace it with direct initData check
const oldPromptRegex = /promptAdminLogin\(\) \{[\s\S]*?\},/g;
const newPrompt = `promptAdminLogin() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            this.state.adminToken = window.Telegram.WebApp.initData;
            this.navigate('admin');
        } else {
            alert('يجب فتح لوحة المشرف من داخل تطبيق تيليجرام.');
        }
    },`;

if(code.match(oldPromptRegex)) {
    code = code.replace(oldPromptRegex, newPrompt);
}

// 2. Replace loadAdminDashboard stats logic
const oldLoadRegex = /async loadAdminDashboard\(\) \{[\s\S]*?catch \(e\) \{/g;
const newLoad = `async loadAdminDashboard() {
        try {
            const statRes = await fetch('/api/admin/web/stats', { headers: { 'x-admin-token': this.state.adminToken } });
            const statData = await statRes.json();
            if (statData.success) {
                document.getElementById('stat-total').innerText = statData.stats.totalSubs;
                document.getElementById('stat-active').innerText = statData.stats.activeSubs;
                document.getElementById('stat-suspended').innerText = statData.stats.suspendedSubs;
                document.getElementById('stat-expired').innerText = statData.stats.expiredSubs;
                document.getElementById('stat-points').innerText = statData.stats.totalPoints;
                document.getElementById('stat-points-subs').innerText = statData.stats.pointsSubs;
                document.getElementById('stat-unlimited-subs').innerText = statData.stats.unlimitedSubs;
                document.getElementById('stat-reports').innerText = statData.stats.totalReports;
            }

            const usersRes = await fetch('/api/admin/web/users', { headers: { 'x-admin-token': this.state.adminToken } });
            const usersData = await usersRes.json();
            if (usersData.success) {
                this.adminState.users = usersData.users.sort((a,b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
                this.renderAdminUsers();
            }
        } catch (e) {`;

code = code.replace(oldLoadRegex, newLoad);

// 3. Update Modal logic and helper functions
const oldModalRegex = /openAdminUserModal\(chatId = null\) \{[\s\S]*?adminToggleStatus\(\) \{[\s\S]*?\},/g;

const newModalAndActions = `openAdminUserModal(chatId = null) {
        this.adminState.currentEditId = chatId;
        document.getElementById('admin-user-modal').style.display = 'flex';
        
        if (chatId) {
            // Edit Mode
            const u = this.adminState.users.find(x => x.chatId === chatId);
            document.getElementById('modal-user-title').innerText = 'إدارة المشترك';
            document.getElementById('modal-is-edit').value = 'true';
            
            document.getElementById('modal-chat-id').value = u.chatId;
            document.getElementById('modal-chat-id').disabled = true;
            document.getElementById('modal-username-group').style.display = 'none';
            
            document.querySelector(\`input[name="modal_sub_type"][value="\${u.type}"]\`).checked = true;
            document.getElementById('modal-days').value = u.daysLeft;
            document.getElementById('modal-points').value = u.points;
            
            // Calculate days
            let usedDays = 0;
            let remDays = 0;
            if (u.startDate && u.endDate) {
                const now = new Date();
                const start = new Date(u.startDate);
                const end = new Date(u.endDate);
                
                const msPerDay = 1000 * 60 * 60 * 24;
                if (now < start) {
                    usedDays = 0;
                    remDays = Math.round((end - start) / msPerDay);
                } else if (now > end) {
                    usedDays = Math.round((end - start) / msPerDay);
                    remDays = 0;
                } else {
                    usedDays = Math.round((now - start) / msPerDay);
                    remDays = Math.round((end - now) / msPerDay);
                }
            }

            const infoDiv = document.getElementById('modal-user-info');
            infoDiv.style.display = 'block';
            infoDiv.innerHTML = \`
                <div><strong>📅 تاريخ البداية:</strong> \${u.startDate ? new Date(u.startDate).toLocaleDateString('ar-SA') : '-'}</div>
                <div><strong>🏁 تاريخ الانتهاء:</strong> \${u.endDate ? new Date(u.endDate).toLocaleDateString('ar-SA') : '-'}</div>
                <div><strong>⏱️ الأيام المستخدمة:</strong> \${usedDays} يوم</div>
                <div><strong>⏳ الأيام المتبقية:</strong> \${remDays} يوم</div>
                <div><strong>📄 عدد التقارير:</strong> \${u.reportsCount} تقرير</div>
            \`;

            document.getElementById('modal-edit-actions').style.display = 'flex';
            document.getElementById('btn-save-user').style.display = 'none';
            
            const statusBtn = document.getElementById('btn-toggle-status');
            if (u.status === 'active') {
                statusBtn.innerText = '⏸️ إيقاف الاشتراك';
                statusBtn.style.background = '#FF9800';
            } else {
                statusBtn.innerText = '▶️ تفعيل الاشتراك';
                statusBtn.style.background = '#4CAF50';
            }
        } else {
            // Add Mode
            document.getElementById('modal-user-title').innerText = 'إضافة مشترك جديد';
            document.getElementById('modal-is-edit').value = 'false';
            
            document.getElementById('modal-chat-id').value = '';
            document.getElementById('modal-chat-id').disabled = false;
            document.getElementById('modal-username').value = '';
            document.getElementById('modal-username-group').style.display = 'block';
            
            document.querySelector('input[name="modal_sub_type"][value="unlimited"]').checked = true;
            document.getElementById('modal-days').value = '30';
            document.getElementById('modal-points').value = '10';
            
            document.getElementById('modal-user-info').style.display = 'none';
            document.getElementById('modal-edit-actions').style.display = 'none';
            document.getElementById('btn-save-user').style.display = 'block';
        }
        
        this.toggleAdminModalType();
    },

    toggleAdminModalType() {
        const type = document.querySelector('input[name="modal_sub_type"]:checked').value;
        if (type === 'unlimited') {
            document.getElementById('modal-days-container').style.display = 'block';
            document.getElementById('modal-points-container').style.display = 'none';
        } else {
            document.getElementById('modal-days-container').style.display = 'none';
            document.getElementById('modal-points-container').style.display = 'block';
        }
    },

    async adminUpdateApi(action, data) {
        try {
            const chatId = this.adminState.currentEditId || document.getElementById('modal-chat-id').value.trim();
            if (!chatId) return alert('يجب إدخال Chat ID');

            const res = await fetch('/api/admin/web/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': this.state.adminToken },
                body: JSON.stringify({ chatId, action, data })
            });
            const result = await res.json();
            
            if (result.success) {
                const idx = this.adminState.users.findIndex(u => u.chatId === result.user.chatId);
                const uData = {
                    chatId: result.user.chatId,
                    username: result.user.username || '',
                    status: result.user.status,
                    type: result.user.subscription_type,
                    points: result.user.balance_points || 0,
                    daysLeft: result.user.subscriptionDays,
                    reportsCount: result.user.reports ? result.user.reports.length : 0,
                    startDate: result.user.subscription_start_date,
                    endDate: result.user.subscription_end_date
                };
                if (idx > -1) this.adminState.users[idx] = uData;
                else this.adminState.users.unshift(uData);

                this.renderAdminUsers(document.getElementById('admin-search-input').value.trim());
                if (action === 'create') {
                    document.getElementById('admin-user-modal').style.display = 'none';
                    alert('تم إضافة المشترك بنجاح!');
                } else if (action === 'cancel') {
                    alert('تم إلغاء الاشتراك بنجاح.');
                    this.openAdminUserModal(chatId);
                } else {
                    this.openAdminUserModal(chatId);
                }
                
                this.loadAdminDashboard();
            } else {
                alert('خطأ: ' + result.error);
            }
        } catch(e) {
            alert('حدث خطأ: ' + e.message);
        }
    },

    adminSaveUser() {
        const type = document.querySelector('input[name="modal_sub_type"]:checked').value;
        const data = {
            type,
            days: document.getElementById('modal-days').value,
            points: document.getElementById('modal-points').value,
            username: document.getElementById('modal-username').value
        };
        const isEdit = document.getElementById('modal-is-edit').value === 'true';
        this.adminUpdateApi(isEdit ? 'update_type' : 'create', data);
    },

    adminModifyPoints(action) {
        const amt = prompt(\`أدخل عدد النقاط المراد \${action === 'add' ? 'إضافتها' : 'خصمها'}:\`);
        if (!amt || isNaN(amt)) return;
        const reason = prompt("السبب (اختياري):") || 'عبر لوحة تحكم الويب';
        this.adminUpdateApi(action + '_points', { amount: amt, reason });
    },

    adminUpdateSubscriptionType(type) {
        if(confirm(\`هل أنت متأكد من تغيير نوع الاشتراك إلى \${type === 'points' ? 'نقاط' : 'غير محدود' }؟\`)) {
            const days = prompt("أدخل المدة بالأيام:", "30");
            if (!days || isNaN(days)) return;
            let points = "0";
            if (type === 'points') {
                points = prompt("أدخل رصيد النقاط:", "10");
                if (!points || isNaN(points)) return;
            }
            this.adminUpdateApi('update_type', { type, days, points });
        }
    },

    adminRenewSub() {
        const days = prompt("أدخل عدد أيام التجديد:", "30");
        if (!days || isNaN(days)) return;
        
        let points = "0";
        const currentUser = this.adminState.users.find(u => u.chatId === this.adminState.currentEditId);
        if (currentUser && currentUser.type === 'points') {
            points = prompt("أدخل النقاط الجديدة التي تريد إضافتها مع التجديد:", "10");
            if (!points || isNaN(points)) return;
        }

        if(confirm("تأكيد تجديد الاشتراك؟")) {
            this.adminUpdateApi('renew', { days, points });
        }
    },

    adminCancelSub() {
        if(confirm("⚠️ هل أنت متأكد من إلغاء اشتراك هذا المشترك نهائياً؟")) {
            this.adminUpdateApi('cancel', {});
        }
    },

    adminToggleStatus() {
        if(confirm("هل أنت متأكد من تغيير حالة المشترك؟")) {
            this.adminUpdateApi('toggle_status', {});
        }
    },`;

code = code.replace(oldModalRegex, newModalAndActions);

fs.writeFileSync('app.js', code, 'utf8');
console.log('app.js patched.');
