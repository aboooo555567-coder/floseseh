const app = {
    tg: window.Telegram ? window.Telegram.WebApp : null,
    state: {
        chatId: null,
        user: null,
        points: 0,
        subscriptionDays: 0,
        reports: [],
        currentStep: 1,
        leaveType: 'sickleave', // 'sickleave' or 'companion'
        hospitalLogoUrl: './الشعارات/Saudi_Ministry_of_Health.JPG' // Default MOH logo
    },

    currentDropdown: null,
    dropdownData: {
        nationality: [
            "السعودية", "الإمارات", "البحرين", "الكويت", "عمان", "قطر", "اليمن", "الأردن", "سوريا", "لبنان", "فلسطين", "العراق", "مصر", "السودان", "ليبيا", "تونس", "الجزائر", "المغرب", "موريتانيا", "الصومال", "جيبوتي", "جزر القمر", "الهند", "باكستان", "بنجلاديش", "أفغانستان", "إندونيسيا", "ماليزيا", "الفلبين", "سريلانكا", "نيبال", "تركيا", "إيران", "الصين", "اليابان", "كوريا الجنوبية", "روسيا", "الولايات المتحدة", "بريطانيا", "فرنسا", "ألمانيا", "إيطاليا", "إسبانيا", "كندا", "أستراليا", "البرازيل", "الأرجنتين", "المكسيك", "جنوب أفريقيا", "نيجيريا", "إثيوبيا", "كينيا", "أوغندا", "تشاد", "النيجر", "مالي", "السنغال"
        ],
        hospital: [
            "مستشفى الملك فهد التخصصي", "مستشفى باقدو والدكتور عرفان العام", "مدينة الملك فهد الطبية", "مستشفى الملك فيصل التخصصي", "مستشفى القوات المسلحة", "مستشفى الدكتور سليمان الحبيب", "المستشفى السعودي الألماني"
        ]
    },

    openDropdown(type) {
        this.currentDropdown = type;
        const overlay = document.getElementById('custom-select-overlay');
        const input = document.getElementById('custom-select-input');
        input.value = '';
        overlay.classList.add('active');
        this.renderDropdownList(this.dropdownData[type]);
        input.focus();
    },

    closeDropdown() {
        document.getElementById('custom-select-overlay').classList.remove('active');
        this.currentDropdown = null;
    },

    renderDropdownList(items) {
        const list = document.getElementById('custom-select-list');
        list.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'custom-select-item';
            div.innerText = item;
            div.onclick = () => {
                const targetInput = document.getElementById(this.currentDropdown === 'hospital' ? 'hospital_ar' : 'nationality');
                targetInput.value = item;
                if(this.currentDropdown === 'hospital') this.syncHospitalEn();
                this.closeDropdown();
            };
            list.appendChild(div);
        });
    },

    filterCustomSelect() {
        if(!this.currentDropdown) return;
        const query = document.getElementById('custom-select-input').value.toLowerCase();
        const filtered = this.dropdownData[this.currentDropdown].filter(item => item.toLowerCase().includes(query));
        this.renderDropdownList(filtered);
    },

    async init() {
        if (this.tg) {
            this.tg.expand();
            if (this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
                this.state.chatId = this.tg.initDataUnsafe.user.id;
                this.state.user = this.tg.initDataUnsafe.user;
            } else {
                // Mock for local testing
                this.state.chatId = "123456789";
            }
        } else {
            this.state.chatId = "123456789";
        }

        await this.loadLocalData();
        this.updateDashboardUI();
        this.loadPdfTemplate();
        
        // Listeners for file upload
        document.getElementById('hospital_logo').addEventListener('change', (e) => this.handleLogoUpload(e));
        
        // Sync with server asynchronously
        this.syncDataWithServer().catch(err => console.warn('Offline mode active', err));
    },

    async loadLocalData() {
        try {
            const res = await fetch('/subscriptions.json');
            if (res.ok) {
                const data = await res.json();
                if (data.subscriptions && data.subscriptions[this.state.chatId]) {
                    const u = data.subscriptions[this.state.chatId];
                    this.state.points = u.points || 0;
                    this.state.subscriptionDays = u.subscriptionDays || 0;
                    this.state.reports = u.reports || [];
                }
            }
        } catch (e) {
            console.log('No local data found or offline');
        }
    },

    async syncDataWithServer() {
        if (!this.state.chatId) return;
        const res = await fetch(`/api/user/${this.state.chatId}`);
        if (res.ok) {
            const data = await res.json();
            this.state.points = data.user?.points || data.points || 0;
            this.state.subscriptionDays = data.user?.subscriptionDays || data.subscriptionDays || 0;
            this.state.reports = data.reports || data.user?.reports || [];
            if (data.user?.mohLogo) this.state.mohLogoUrl = data.user.mohLogo;
            if (data.user?.hospitalLogo) this.state.hospitalLogoUrl = data.user.hospitalLogo;
            this.updateDashboardUI();
        }
    },

    updateDashboardUI() {
        document.getElementById('points-balance-display').innerText = this.state.points;
        const subBadge = document.getElementById('sub-status-badge');
        if (this.state.subscriptionDays > 0) {
            subBadge.innerText = `نشط - متبقي ${this.state.subscriptionDays} يوم`;
            subBadge.style.color = '#009688';
        } else {
            subBadge.innerText = 'غير نشط - متبقي 0 يوم';
            subBadge.style.color = '#e74c3c';
        }
        
        this.renderReports(this.state.reports);
    },

    searchReports() {
        const term = document.getElementById('report-search').value.toLowerCase();
        const filtered = this.state.reports.filter(r => {
            const data = r.data || {};
            const name = (r.patientName || "").toLowerCase();
            const nid = (data.national_id || "").toLowerCase();
            return name.includes(term) || nid.includes(term);
        });
        this.renderReports(filtered);
    },

    renderReports(reportsToRender) {
        const reportsList = document.getElementById('reports-list');
        reportsList.innerHTML = '';
        if (reportsToRender.length === 0) {
            reportsList.innerHTML = '<p style="text-align:center; color:#777; margin-top:30px;">لا توجد تقارير مطابقة</p>';
        } else {
            reportsToRender.forEach(r => {
                const card = document.createElement('div');
                card.className = 'report-card';
                card.innerHTML = `
                    <div class="report-info">
                        <h4>${r.patientName}</h4>
                        <p>${r.type === 'companion' ? 'مرافقة مريض' : 'إجازة مرضية'} • ${r.issueDate}</p>
                    </div>
                    <div class="report-actions">
                        <button onclick="app.copyReportId('${r.id}')" title="نسخ رقم التقرير">📋</button>
                        <button onclick="app.editReport('${r.id}')" title="تعديل التقرير">✏️</button>
                    </div>
                `;
                reportsList.appendChild(card);
            });
        }
    },

    copyReportId(id) {
        navigator.clipboard.writeText(id).then(() => {
            if(this.tg) this.tg.showAlert('تم نسخ رقم التقرير!');
            else alert('تم النسخ');
        });
    },

    navigate(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screenId}-screen`).classList.add('active');
        if(screenId === 'dashboard') {
            document.getElementById('fab-menu').style.display = 'block';
        } else {
            document.getElementById('fab-menu').style.display = 'none';
        }
    },

    toggleFab() {
        const fabContainer = document.getElementById('fab-menu');
        const overlay = document.getElementById('fab-overlay');
        const fabMain = document.getElementById('fab-main');
        
        fabContainer.classList.toggle('active');
        overlay.classList.toggle('active');
        fabMain.classList.toggle('active');
    },

    startForm(type) {
        this.toggleFab();
        this.state.leaveType = type;
        this.state.currentStep = 1;
        
        document.getElementById('form-title').innerText = type === 'companion' ? 'إصدار تقرير مرافقة مريض' : 'إصدار تقرير جديد';
        
        const typeSelect = document.getElementById('leave_type');
        typeSelect.innerHTML = type === 'companion' ? '<option value="Companion">Companion</option>' : '<option value="GSL">GSL</option>';
        
        document.getElementById('escort-fields').style.display = type === 'companion' ? 'block' : 'none';
        
        this.updateWizardUI();
        this.navigate('form');
        
        // Auto-fill current date and time
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);
        const todayStr = localISOTime.split('T')[0];
        
        document.getElementById('issue_date').value = todayStr;
        document.getElementById('admission_date').value = todayStr;
        document.getElementById('discharge_date').value = todayStr;
        
        let hours = now.getHours().toString().padStart(2, '0');
        let minutes = now.getMinutes().toString().padStart(2, '0');
        document.getElementById('issue_time').value = `${hours}:${minutes}`;
    },

    syncHospitalEn() {
        const ar = document.getElementById('hospital_ar').value;
        const enInput = document.getElementById('hospital_en');
        const map = {
            "مستشفى الملك فهد التخصصي": "King Fahad Specialist Hospital",
            "مستشفى باقدو والدكتور عرفان العام": "Dr. Erfan Bagedo General Hospital",
            "مدينة الملك فهد الطبية": "King Fahad Medical City",
            "مستشفى الملك فيصل التخصصي": "King Faisal Specialist Hospital",
            "مستشفى القوات المسلحة": "Armed Forces Hospital",
            "مستشفى الدكتور سليمان الحبيب": "Dr. Sulaiman Al Habib Hospital",
            "المستشفى السعودي الألماني": "Saudi German Hospital"
        };
        if (map[ar]) {
            enInput.value = map[ar];
        }
    },

    editReport(id) {
        const report = this.state.reports.find(r => r.id === id);
        if(!report || !report.data) {
            alert('عذراً، بيانات هذا التقرير القديم غير متوفرة للتعديل.');
            return;
        }
        
        this.startForm(report.type);
        
        // Populate fields
        for (const [key, value] of Object.entries(report.data)) {
            const el = document.getElementById(key);
            if(el && key !== 'hospital_type') {
                el.value = value || '';
            }
        }
        
        // Radio button
        if(report.data.hospital_type) {
            const radio = document.querySelector(`input[name="hospital_type"][value="${report.data.hospital_type}"]`);
            if(radio) {
                radio.checked = true;
                this.toggleLicense();
            }
        }
    },

    updateWizardUI() {
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${this.state.currentStep}`).classList.add('active');
        
        const progress = (this.state.currentStep / 3) * 100;
        document.getElementById('form-progress').style.width = `${progress}%`;
    },

    nextStep() {
        // Simple required validation
        const currentForm = document.getElementById(`step-${this.state.currentStep}`);
        const inputs = currentForm.querySelectorAll('input[required], select[required]');
        let valid = true;
        inputs.forEach(i => {
            if(!i.value) {
                valid = false;
                i.style.borderColor = 'red';
            } else {
                i.style.borderColor = '#ddd';
            }
        });
        
        if(!valid) {
            if(this.tg) this.tg.showAlert('يرجى تعبئة الحقول المطلوبة.');
            else alert('يرجى تعبئة الحقول المطلوبة.');
            return;
        }

        if (this.state.currentStep < 3) {
            this.state.currentStep++;
            this.updateWizardUI();
        }
    },

    prevStep() {
        if (this.state.currentStep > 1) {
            this.state.currentStep--;
            this.updateWizardUI();
        }
    },

    toggleLicense() {
        const isPrivate = document.querySelector('input[name="hospital_type"]:checked').value === 'private';
        document.getElementById('license-field').style.display = isPrivate ? 'block' : 'none';
    },

    handleLogoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.state.hospitalLogoUrl = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    },

    buyPackage(pkgName) {
        if(this.tg) {
            this.tg.openTelegramLink('https://t.me/zakmmm_1211');
        } else {
            window.open('https://t.me/zakmmm_1211', '_blank');
        }
    },

    async loadPdfTemplate() {
        const res = await fetch('pdf-template.html');
        const html = await res.text();
        document.getElementById('pdf-container').innerHTML = html;
    },

    getHijriDate(dateString) {
        if(!dateString) return "";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).format(date).replace(/AH/g, '').trim().replace(/\//g, '-');
    },

    formatGregorian(dateString) {
        if(!dateString) return "";
        const parts = dateString.split('-');
        if(parts.length===3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateString;
    },

    formatAMPM(timeStr) {
        if(!timeStr) return "";
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        let ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${hours}:${minutes} ${ampm}`;
    },

    formatDateLabel(dateStr) {
        const d = new Date(dateStr);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return ` ${days[d.getDay()]} ,${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    },

    async submitForm() {
        // Final Validation
        if(this.state.points < 5 && this.state.subscriptionDays <= 0) {
            if(this.tg) this.tg.showAlert("رصيدك غير كافٍ. تحتاج إلى 5 نقاط على الأقل.");
            else alert("رصيدك غير كافٍ. تحتاج إلى 5 نقاط على الأقل.");
            return;
        }

        // Show loading
        document.getElementById('loading-overlay').style.display = 'flex';
        
        try {
            await this.populatePdfAndGenerate();
        } catch(e) {
            console.error(e);
            alert("حدث خطأ أثناء إصدار التقرير.");
            document.getElementById('loading-overlay').style.display = 'none';
        }
    },

    async populatePdfAndGenerate() {
        // 1. Gather Data
        const type = this.state.leaveType;
        const admission = document.getElementById('admission_date').value;
        const discharge = document.getElementById('discharge_date').value;
        const duration = document.getElementById('duration').value;
        const issueDate = document.getElementById('issue_date').value;
        const issueTime = document.getElementById('issue_time').value;

        const pNameAr = document.getElementById('patient_name_ar').value;
        const pNameEn = document.getElementById('patient_name_en').value;
        const idNum = document.getElementById('national_id').value;
        const nationalityAr = document.getElementById('nationality').value;
        const nationalityEn = nationalityAr === 'السعودية' ? 'Saudi Arabia' : nationalityAr;
        const employer = document.getElementById('employer').value;

        const docNameAr = document.getElementById('doctor_name_ar').value;
        const docNameEn = document.getElementById('doctor_name_en').value;
        const jobAr = document.getElementById('job_title_ar').value;
        const jobEn = document.getElementById('job_title_en').value;
        
        const hospAr = document.getElementById('hospital_ar').value;
        const hospEn = document.getElementById('hospital_en').value;
        const isPrivate = document.querySelector('input[name="hospital_type"]:checked').value === 'private';
        const license = document.getElementById('license_number').value;

        const reportId = `GSL${Math.floor(Math.random() * 10000000000)}`;

        // 2. Populate PDF Template
        document.getElementById('pdf-leave-id').innerText = reportId;
        
        const hijriAdm = this.getHijriDate(admission);
        const hijriDis = this.getHijriDate(discharge);
        const gregoAdm = this.formatGregorian(admission);
        const gregoDis = this.formatGregorian(discharge);
        
        document.getElementById('pdf-duration-en').innerText = `${duration} day ( ${gregoAdm} to ${gregoDis} )`;
        document.getElementById('pdf-duration-ar').innerText = `${duration} يوم ( ${hijriAdm} الى ${hijriDis} )`;

        document.getElementById('pdf-admission-g').innerText = gregoAdm;
        document.getElementById('pdf-admission-h').innerText = hijriAdm;
        document.getElementById('pdf-discharge-g').innerText = gregoDis;
        document.getElementById('pdf-discharge-h').innerText = hijriDis;
        
        document.getElementById('pdf-issue-date').innerText = this.formatGregorian(issueDate);
        
        document.getElementById('pdf-national-id').innerText = idNum;
        document.getElementById('pdf-nationality-en').innerText = nationalityEn;
        document.getElementById('pdf-nationality-ar').innerText = nationalityAr;
        
        document.getElementById('pdf-employer-en').innerText = employer;
        document.getElementById('pdf-employer-ar').innerText = employer || "لا يوجد";
        
        document.getElementById('pdf-doctor-en').innerText = docNameEn.toUpperCase();
        document.getElementById('pdf-doctor-ar').innerText = docNameAr;
        document.getElementById('pdf-position-en').innerText = jobEn;
        document.getElementById('pdf-position-ar').innerText = jobAr;
        
        document.getElementById('pdf-hospital-en').innerText = hospEn;
        document.getElementById('pdf-hospital-ar').innerText = hospAr;
        
        if (isPrivate && license) {
            document.getElementById('pdf-license').style.display = 'block';
            document.getElementById('pdf-license-val').innerText = license;
        } else {
            document.getElementById('pdf-license').style.display = 'none';
        }
        
        document.getElementById('pdf-hospital-logo').src = this.state.hospitalLogoUrl;
        
        if (this.state.mohLogoUrl) {
            const mohContainer = document.getElementById('pdf-moh-logo-container');
            const mohImg = document.getElementById('pdf-moh-logo');
            if (mohContainer && mohImg) {
                mohContainer.style.display = 'block';
                mohImg.src = this.state.mohLogoUrl;
            }
        } else {
            const mohContainer = document.getElementById('pdf-moh-logo-container');
            if (mohContainer) {
                mohContainer.style.display = 'none';
            }
        }

        // Type specific adjustments
        if (type === 'companion') {
            document.getElementById('pdf-title-ar').innerText = "تقرير مرافقة مريض";
            document.getElementById('pdf-title-en').innerText = "Patient Companion Report";
            
            document.getElementById('pdf-name-label-en').innerText = "Companion Name";
            document.getElementById('pdf-name-label-ar').innerText = "اسم المرافق";
            const escEn = document.getElementById('escort_name_en').value;
            const escAr = document.getElementById('escort_name_ar').value;
            document.getElementById('pdf-name-en').innerText = escEn.toUpperCase();
            document.getElementById('pdf-name-ar').innerText = escAr;
            
            document.getElementById('pdf-relation-row').style.display = 'table-row';
            document.getElementById('pdf-relation-en').innerText = document.getElementById('relation_en').value;
            document.getElementById('pdf-relation-ar').innerText = document.getElementById('relation_ar').value;

            document.getElementById('pdf-doc-label-en').innerText = "Physician Name";
            document.getElementById('pdf-doc-label-ar').innerText = "اسم الطبيب المعالج";
        } else {
            document.getElementById('pdf-title-ar').innerText = "تقرير إجازة مرضية";
            document.getElementById('pdf-title-en').innerText = "Sick Leave Report";
            
            document.getElementById('pdf-name-label-en').innerText = "Name";
            document.getElementById('pdf-name-label-ar').innerText = "الاسم";
            document.getElementById('pdf-name-en').innerText = pNameEn.toUpperCase();
            document.getElementById('pdf-name-ar').innerText = pNameAr;
            
            document.getElementById('pdf-relation-row').style.display = 'none';
            document.getElementById('pdf-doc-label-en').innerText = "Practitioner Name";
            document.getElementById('pdf-doc-label-ar').innerText = "اسم الممارس";
        }

        // Generate QR Code Optional
        document.getElementById('pdf-qrcode').innerHTML = "";
        const includeQR = document.getElementById('include_qr') ? document.getElementById('include_qr').checked : true;
        
        const verifyParams = new URLSearchParams({
            id: reportId,
            nid: idNum,
            name: type === 'companion' ? escAr : pNameAr,
            issue: issueDate,
            start: admission,
            end: discharge,
            dur: duration,
            doc: docNameAr,
            pos: jobAr
        });
        const verifyUrl = `${window.location.origin}/verify.html?${verifyParams.toString()}`;
        
        if (includeQR) {
            new QRCode(document.getElementById('pdf-qrcode'), {
                text: verifyUrl,
                width: 100,
                height: 100,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.L
            });
        }

        document.getElementById('pdf-time').innerText = this.formatAMPM(issueTime);
        document.getElementById('pdf-day-date').innerText = this.formatDateLabel(issueDate);

        // 3. Generate PDF
        const element = document.getElementById('pdf-content');
        const container = document.getElementById('pdf-container');
        
        // Temporarily bring the container on-screen behind the loading overlay
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '9999';

        const originalDir = document.documentElement.dir;
        document.documentElement.dir = 'ltr'; 

        // Let html2canvas handle images automatically

        try {
            const opt = {
                margin:       0,
                filename:     'sickLeaves.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, windowWidth: 794, width: 794, x: 0, y: 0, scrollX: 0, scrollY: 0 },
                jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' }
            };

            const pdfPromise = (async () => {
                return await html2pdf().set(opt).from(element).outputPdf('blob');
            })();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Canvas timeout')), 15000));
            const pdfBlob = await Promise.race([pdfPromise, timeoutPromise]);
            
            document.documentElement.dir = originalDir;
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.zIndex = 'auto';

            // 4. Send to Backend
            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                
                // Deduct points
                app.state.points -= 5;

                const response = await fetch('/api/send-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chatId: app.state.chatId,
                        pdfBase64: base64data,
                        filename: 'sickLeaves.pdf',
                    reportId: reportId
                })
            });

            // Also save report data
            await fetch(`/api/report/${app.state.chatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    report: {
                        id: reportId,
                        patientName: type === 'companion' ? document.getElementById('escort_name_ar').value : pNameAr,
                        type: type,
                        issueDate: issueDate,
                        data: {
                            admission_date: admission,
                            discharge_date: discharge,
                            duration: duration,
                            issue_date: issueDate,
                            issue_time: issueTime,
                            national_id: idNum,
                            patient_name_ar: pNameAr,
                            patient_name_en: pNameEn,
                            nationality: document.getElementById('nationality').value,
                            employer: employer,
                            escort_name_ar: document.getElementById('escort_name_ar').value,
                            escort_name_en: document.getElementById('escort_name_en').value,
                            relation_ar: document.getElementById('relation_ar').value,
                            relation_en: document.getElementById('relation_en').value,
                            doctor_name_ar: docNameAr,
                            doctor_name_en: docNameEn,
                            job_title_ar: jobAr,
                            job_title_en: jobEn,
                            hospital_ar: hospAr,
                            hospital_en: hospEn,
                            hospital_type: document.querySelector('input[name="hospital_type"]:checked').value,
                            license_number: license
                        }
                    }
                })
            });

            document.getElementById('loading-overlay').style.display = 'none';

            if(response.ok) {
                document.getElementById('report-form').reset();
                app.navigate('success');
            } else {
                alert("❌ حدث خطأ أثناء الإرسال للسيرفر.");
                fetch('/api/logs?msg=Server_Error_' + response.status);
            }
        }; // End of reader.onloadend
        } catch(e) {
            document.documentElement.dir = originalDir;
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.zIndex = 'auto';
            console.error("PDF Generation error: ", e);
            fetch('/api/logs?msg=' + encodeURIComponent('Client_Error: ' + e.message));
            alert("حدث خطأ أثناء إصدار التقرير: " + e.message);
            document.getElementById('loading-overlay').style.display = 'none';
        }
    },

    closeApp() {
        if(this.tg) {
            this.tg.close();
        } else {
            window.close();
        }
    }
};

window.onload = () => {
    app.init();
};

