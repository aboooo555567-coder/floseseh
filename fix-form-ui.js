const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

const startTarget = '<div class="form-group">\n                        <label>نوع المستشفى</label>';
const endTarget = '</div>\n            </form>';

const startIndex = indexHtml.indexOf('<div class="form-group">\n                        <label>نوع المستشفى</label>');
if(startIndex === -1) {
    // try alternative
    console.log("Could not find start index precisely. Trying regex or another substring.");
}

// Let's use a more robust replacement using string splitting based on known elements
const searchStart = '<div class="form-group">\n                        <label>نوع المستشفى</label>';

let index1 = indexHtml.indexOf('<div class="form-group">', indexHtml.indexOf('hospital_en'));
let index2 = indexHtml.indexOf('</form>', index1);

if (index1 !== -1 && index2 !== -1) {
    const before = indexHtml.substring(0, index1);
    const after = indexHtml.substring(index2);
    
    const newHtml = `<style>
                        /* Custom Radio Buttons */
                        .custom-radio-group { display: flex; justify-content: flex-end; gap: 20px; margin-top: 8px; direction: rtl; }
                        .custom-radio-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 16px; color: #223344; }
                        .custom-radio-input { appearance: none; width: 18px; height: 18px; border: 1px solid #778899; border-radius: 50%; outline: none; transition: 0.2s; position: relative; margin: 0; cursor: pointer; background: white; }
                        .custom-radio-input:checked { border: 5px solid #007BFF; }
                        
                        /* Custom File Upload */
                        .custom-file-upload-wrapper { border: 1px solid #E2E6EA; border-radius: 12px; padding: 10px; display: flex; align-items: center; background: white; margin-top: 10px; direction: rtl; cursor: pointer; }
                        .custom-file-btn { border: 1px solid #444; background: #F8F9FA; border-radius: 4px; padding: 8px 16px; font-family: 'Tajawal', sans-serif; cursor: pointer; color: #111; font-size: 14px; pointer-events: none; }
                        .custom-file-text { color: #112233; font-size: 16px; flex-grow: 1; text-align: left; padding-left: 15px; }
                        .custom-file-input { display: none; }

                        /* Custom Checkbox */
                        .custom-checkbox-wrapper { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 25px; margin-bottom: 30px; direction: rtl; }
                        .custom-checkbox-input { appearance: none; width: 20px; height: 20px; border: 1px solid #8899AA; border-radius: 3px; outline: none; cursor: pointer; position: relative; background: white; }
                        .custom-checkbox-input:checked::after { content: '\\2714'; position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; color: #333; }
                        
                        /* Dual Buttons */
                        .custom-actions-dual { display: flex; gap: 15px; direction: rtl; }
                        .custom-btn-submit { flex: 1; background-color: #28A745; color: white; border: none; border-radius: 10px; padding: 16px; font-size: 18px; font-family: 'Tajawal', sans-serif; cursor: pointer; }
                        .custom-btn-prev { flex: 1; background-color: #E9ECEF; color: #112233; border: none; border-radius: 10px; padding: 16px; font-size: 18px; font-family: 'Tajawal', sans-serif; cursor: pointer; }
                    </style>

                    <div class="form-group" style="text-align: right;">
                        <label style="display:block; margin-bottom:8px; color:#112233; font-size: 16px;">نوع المستشفى</label>
                        <div class="custom-radio-group">
                            <label class="custom-radio-label">
                                <input type="radio" name="hospital_type" value="gov" class="custom-radio-input" checked onchange="app.toggleLicense()"> حكومي
                            </label>
                            <label class="custom-radio-label">
                                <input type="radio" name="hospital_type" value="private" class="custom-radio-input" onchange="app.toggleLicense()"> خاص
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group" id="license-field" style="display:none; text-align: right;">
                        <label style="display:block; margin-bottom:8px;">رقم الترخيص (خاص بالقطاع الخاص)</label>
                        <input type="text" id="license_number" placeholder="أدخل رقم ترخيص المنشأة" style="width:100%; border:1px solid #ddd; border-radius:8px; padding:10px; box-sizing: border-box; font-family: 'Tajawal', sans-serif;">
                    </div>

                    <div class="form-group" style="text-align: right; margin-top:20px;">
                        <label style="display:block; margin-bottom:5px; color:#112233; font-size: 16px;">اختر شعار المستشفى (اختياري)</label>
                        <div class="custom-file-upload-wrapper" onclick="document.getElementById('hospital_logo').click()">
                            <button type="button" class="custom-file-btn">اختيار ملفّ</button>
                            <span class="custom-file-text" id="file-upload-text">لم يتمّ اختيار أيّ ملفّ</span>
                            <input type="file" id="hospital_logo" accept="image/png, image/jpeg" class="custom-file-input" onchange="document.getElementById('file-upload-text').innerText = this.files.length ? this.files[0].name : 'لم يتمّ اختيار أيّ ملفّ'">
                        </div>
                        <small style="color:#8899AA; display:block; margin-top:8px; font-size:13px;">يفضل صورة بخلفية شفافة (PNG) بحجم أقل من 2MB</small>
                    </div>

                    <div class="custom-checkbox-wrapper">
                        <label for="include_qr" style="margin: 0; font-size: 16px; color: #112233; cursor: pointer;">إضافة باركود (QR Code) للتقرير</label>
                        <input type="checkbox" id="include_qr" class="custom-checkbox-input" checked>
                    </div>

                    <div class="custom-actions-dual">
                        <button type="button" class="custom-btn-submit" onclick="app.submitForm()">إصدار التقرير</button>
                        <button type="button" class="custom-btn-prev" onclick="app.prevStep()">السابق</button>
                    </div>
                </div>
            `;
    
    // Also bump app.js cache bust
    let finalHtml = before + newHtml + after;
    finalHtml = finalHtml.replace(/app\.js\?v=\d+/, 'app.js?v=' + Math.floor(Math.random() * 10000));
    
    fs.writeFileSync('index.html', finalHtml, 'utf8');
    console.log('UI updated successfully.');
} else {
    console.log('Could not find injection points.');
}
