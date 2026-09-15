const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldAdminUI = `                <div class="form-group">
                    <label>المدة (بالأيام)</label>
                    <input type="number" id="admin_days" value="30" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                </div>
                <div class="form-group">
                    <label>عدد النقاط</label>
                    <input type="number" id="admin_points" value="10" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                </div>`;

const newAdminUI = `                <div class="form-group">
                    <label>نوع الاشتراك</label>
                    <div class="radio-group" style="display:flex; gap:10px; margin-top:5px; margin-bottom:15px;">
                        <label style="flex:1; border:1px solid #ddd; padding:10px; border-radius:8px; text-align:center;">
                            <input type="radio" name="admin_sub_type" value="unlimited" checked onchange="document.getElementById('admin_days_container').style.display='block'; document.getElementById('admin_points_container').style.display='none';"> غير محدود (أيام)
                        </label>
                        <label style="flex:1; border:1px solid #ddd; padding:10px; border-radius:8px; text-align:center;">
                            <input type="radio" name="admin_sub_type" value="points" onchange="document.getElementById('admin_days_container').style.display='none'; document.getElementById('admin_points_container').style.display='block';"> بالنقاط (تقارير)
                        </label>
                    </div>
                </div>
                <div class="form-group" id="admin_days_container">
                    <label>المدة (بالأيام)</label>
                    <input type="number" id="admin_days" value="30" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                    <small style="color:#666;">يسمح بإنشاء تقارير غير محدودة خلال هذه الفترة.</small>
                </div>
                <div class="form-group" id="admin_points_container" style="display:none;">
                    <label>عدد النقاط (التقارير)</label>
                    <input type="number" id="admin_points" value="10" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                    <small style="color:#666;">كل تقرير يخصم 1 نقطة. الصلاحية لا تنتهي.</small>
                </div>`;

html = html.replace(oldAdminUI, newAdminUI);

// Cache bust app.js
html = html.replace(/app\.js\?v=\d+/g, 'app.js?v=' + Math.floor(Math.random() * 10000));

fs.writeFileSync('index.html', html, 'utf8');
console.log('Modified index.html for admin subscription types');
