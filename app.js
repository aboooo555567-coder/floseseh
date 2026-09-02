const app = {
    tg: window.Telegram ? window.Telegram.WebApp : null,
    state: {
        chatId: null,
        user: null,
        points: 0,
        adminToken: null,
        subscriptionDays: 0,
        reports: [],
        currentStep: 1,
        leaveType: 'sickleave', // 'sickleave' or 'companion'
        currentReportId: null,
        hospitalLogoUrl: null // Use default in HTML unless uploaded
    },

    currentDropdown: null,
    dropdownData: {
        nationality: [
            "إثيوبيا",
            "أذربيجاني",
            "أرجنتيني",
            "الأردن",
            "أرميني",
            "إريتريا",
            "إسباني",
            "أستراليا",
            "إستوني",
            "إسرائيلي",
            "إفريقي أوسطي",
            "أفغانستان",
            "إكوادوري",
            "ألباني",
            "ألماني",
            "الإمارات",
            "الولايات المتحدة",
            "أندوري",
            "إندونيسيا",
            "أنغولي",
            "أوروغواياني",
            "أوزبكي",
            "أوغندا",
            "أوكراني",
            "إيران",
            "أيرلندي",
            "أيسلندي",
            "إيطالي",
            "إيفواري",
            "بابواوي",
            "باراغواياني",
            "باربادوسي",
            "باكستان",
            "بالاوي",
            "باهامي",
            "البحرين",
            "برازيلي",
            "برتغالي",
            "بروني",
            "بريطانيا",
            "بلجيكي",
            "بلغاري",
            "بليزي",
            "بنغلاديشي",
            "بنمي",
            "بنيني",
            "بوتاني",
            "بوركيني",
            "بوروندي",
            "بوسني",
            "بولندي",
            "بوليفي",
            "بيروفي",
            "بيلاروسي",
            "تايلاندي",
            "تايواني",
            "تركمانستاني",
            "تركيا",
            "تشادي",
            "تشيكي",
            "تشيلي",
            "تنزاني",
            "توغولي",
            "تونس",
            "تيموري شرقي",
            "جامايكي",
            "الجزائر",
            "جنوب أفريقي",
            "جورجي",
            "جيبوتي",
            "دنماركي",
            "دومينيكاني",
            "رأس أخضري",
            "رواندي",
            "روسي",
            "روماني",
            "زامبي",
            "زيمبابوي",
            "ساموي",
            "سانت لوسي",
            "سريلانكا",
            "السعودية",
            "سلفادوري",
            "سلوفاكي",
            "سلوفيني",
            "سنغافوري",
            "سنغالي",
            "سوازيلندي",
            "السودان",
            "سوريا",
            "سورينامي",
            "سويدي",
            "سويسري",
            "سيراليوني",
            "سيشلي",
            "صربي",
            "الصومال",
            "صيني",
            "طاجيكي",
            "العراق",
            "عمان",
            "غابوني",
            "غامبي",
            "غاني",
            "غرينادي",
            "غواتيمالي",
            "غياني",
            "غيني",
            "غيني استوائي",
            "غيني بيساوي",
            "فرنسي",
            "الفلبين",
            "فلسطين",
            "فنزويلي",
            "فنلندي",
            "فيتنامي",
            "فيجي",
            "قبرصي",
            "قرغيزي",
            "قطر",
            "قمري",
            "كازاخستاني",
            "كاميروني",
            "كرواتي",
            "كمبودي",
            "كندا",
            "كوبي",
            "كوري جنوبي",
            "كوري شمالي",
            "كوستاريكي",
            "كولومبي",
            "كونغولي",
            "الكويت",
            "كيريباتي",
            "كينيا",
            "لاتفي",
            "لاوسي",
            "لبنان",
            "لوكسمبورغي",
            "ليبيا",
            "ليبيري",
            "ليتواني",
            "ليختنشتايني",
            "ليسوثي",
            "مالاوي",
            "مالديفي",
            "مالطي",
            "مالي",
            "ماليزي",
            "مجري",
            "مصر",
            "المغرب",
            "مقدوني",
            "مكسيكي",
            "ملغاشي",
            "منغولي",
            "موريتاني",
            "موريشيوسي",
            "موزمبيقي",
            "مولدوفي",
            "موناكوي",
            "مونتينيغري",
            "ميكرونيزي",
            "ناميبي",
            "ناوروي",
            "نمساوي",
            "نيبال",
            "نيجري",
            "نيجيري",
            "نيكاراغوي",
            "نيوزيلندي",
            "هايتي",
            "هندوراسي",
            "الهند",
            "هولندي",
            "ياباني",
            "اليمن",
            "يوناني"
        ],
        hospital: [
            "مستشفى الملك خالد بنجران",
            "مستشفى نجران العام",
            "مستشفى الولادة والأطفال بنجران",
            "مستشفى إرادة والصحة النفسية بنجران",
            "مستشفى القوات المسلحة بنجران",
            "مستشفى خباش العام",
            "مستشفى حبونا العام",
            "مستشفى شرورة العام",
            "مستشفى بدر الجنوب",
            "مستشفى ثار",
            "مستشفى يدمة العام",
            "مستشفى الملك عبدالعزيز التخصصي بالطائف",
            "مستشفى الملك فيصل بالطائف",
            "مستشفى الأطفال بالطائف",
            "مستشفى الولادة والأطفال بالطائف",
            "مستشفى القوات المسلحة بالهدا",
            "مستشفى الأمير منصور العسكري",
            "مستشفى الصحة النفسية بالطائف",
            "مستشفى النهضة العام",
            "مستشفى الملك خالد ومركز الأمير سلطان للخدمات الصحية بالخرج",
            "مستشفى الولادة والأطفال بالخرج",
            "مستشفى إرادة والصحة النفسية بالخرج",
            "مستشفى القوات المسلحة بالخرج",
            "مستشفى الملك خالد بحفر الباطن",
            "مستشفى حفر الباطن المركزي",
            "مستشفى الولادة والأطفال بحفر الباطن",
            "مستشفى الصحة النفسية بحفر الباطن",
            "مستشفى نور محمد خان",
            "مستشفى الملك فهد التخصصي ببريدة",
            "مستشفى بريدة المركزي",
            "مستشفى الملك سعود بعنيزة",
            "مستشفى الرس العام",
            "مستشفى الولادة والأطفال ببريدة",
            "مستشفى البكيرية العام",
            "مستشفى المذنب العام",
            "مستشفى عيون الجواء العام",
            "مستشفى الملك فهد بالباحة",
            "مستشفى الأمير مشاري بن سعود",
            "مستشفى بلجرشي العام",
            "مستشفى المخواة العام",
            "مستشفى قلوة العام",
            "مستشفى العقيق العام",
            "مستشفى الملك فهد المركزي بجازان",
            "مستشفى الأمير محمد بن ناصر",
            "مستشفى جازان العام",
            "مستشفى الملك عبدالله بجازان",
            "مستشفى صبيا العام",
            "مستشفى أبو عريش العام",
            "مستشفى صامطة العام",
            "مستشفى بيش العام",
            "مستشفى فرسان العام",
            "مستشفى الملك فهد بسكاكا",
            "مستشفى الأمير متعب بن عبدالعزيز",
            "مستشفى سكاكا العام",
            "مستشفى دومة الجندل العام",
            "مستشفى القريات العام",
            "مستشفى طبرجل العام",
            "مستشفى عرعر المركزي",
            "مستشفى الأمير عبدالعزيز بن مساعد",
            "مستشفى طريف العام",
            "مستشفى رفحاء العام",
            "مستشفى العويقيلة العام"
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
        const query = document.getElementById('custom-select-input').value;
        const queryLower = query.toLowerCase();
        let filtered = this.dropdownData[this.currentDropdown].filter(item => item.toLowerCase().includes(queryLower));
        
        // Allow manual custom entry
        if (query.trim() !== '' && !filtered.includes(query.trim())) {
            filtered.unshift(query.trim());
        }
        
        this.renderDropdownList(filtered);
    },


    
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.state.adminToken = urlParams.get('token');
        
        if (window.location.href.includes('screen=admin')) {
            this.navigate('admin');
            // Hide fab just in case
            document.getElementById('fab-menu').style.display = 'none';
        }

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




        

        // Populate datalists
        const hospList = document.getElementById('hospital_list');
        if (hospList) {
            this.dropdownData.hospital.forEach(h => {
                const opt = document.createElement('option');
                opt.value = h;
                hospList.appendChild(opt);
            });
        }
        const natList = document.getElementById('nationality_list');
        if (natList) {
            this.dropdownData.nationality.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                natList.appendChild(opt);
            });
        }


        
        // Listeners for file upload
        const logoInput = document.getElementById('hospital_logo');
        if(logoInput) logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        
        await this.loadPdfTemplate();
        
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

    async fetchAsBase64(url) {
        if (!url || url.startsWith('data:')) return url;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to fetch image as base64:", e);
            return url;
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
            subBadge.innerText = `اشتراك لامحدود - متبقي ${this.state.subscriptionDays} يوم`;
            subBadge.style.color = '#009688';
        } else if (this.state.points >= 5) {
            subBadge.innerText = `اشتراك بالنقاط - متبقي ${Math.floor(this.state.points / 5)} تقرير`;
            subBadge.style.color = '#009688';
        } else {
            subBadge.innerText = 'لا يوجد اشتراك فعال';
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

    
    promptAdminLogin() {
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

    
    async addSubscriber() {
        const id = document.getElementById('admin_chat_id').value.trim();
        const subType = document.querySelector('input[name="admin_sub_type"]:checked').value;
        
        let days = 0;
        let points = 0;
        if (subType === 'unlimited') {
            days = parseInt(document.getElementById('admin_days').value) || 0;
        } else {
            points = parseInt(document.getElementById('admin_points').value) || 0;
        }
        
        if (!id) return alert('الرجاء إدخال ايدي المشترك');
        
        try {
            const res = await fetch(`/api/admin/package`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.state.adminToken, chatId: id, points: points, subscriptionDays: days })
            });
            const data = await res.json();
            if (data.success) {
                alert(`تم تفعيل المشترك بنجاح!\nالرصيد الحالي: ${data.points} تقرير\nأيام الاشتراك: ${data.subscriptionDays} يوم`);
                document.getElementById('admin_chat_id').value = '';
                this.navigate('dashboard');
            } else {
                alert('خطأ: ' + data.error);
            }
        } catch (e) {
            alert('حدث خطأ في الاتصال: ' + e.message);
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
        typeSelect.innerHTML = type === 'companion' ? '<option value="Companion">Companion</option>' : '<option value="GSL">GSL</option><option value="PSL">PSL</option>';
        
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
            "مستشفى الملك خالد بنجران": "King Khalid Hospital, Najran",
            "مستشفى نجران العام": "Najran General Hospital",
            "مستشفى الولادة والأطفال بنجران": "Maternity and Children Hospital, Najran",
            "مستشفى إرادة والصحة النفسية بنجران": "Eradah and Mental Health Hospital, Najran",
            "مستشفى القوات المسلحة بنجران": "Najran Armed Forces Hospital",
            "مستشفى خباش العام": "Khabash General Hospital",
            "مستشفى حبونا العام": "Habuna General Hospital",
            "مستشفى شرورة العام": "Sharurah General Hospital",
            "مستشفى بدر الجنوب": "Badr Al-Janoub Hospital",
            "مستشفى ثار": "Thar Hospital",
            "مستشفى يدمة العام": "Yadamah General Hospital",
            "مستشفى الملك عبدالعزيز التخصصي بالطائف": "King Abdulaziz Specialist Hospital, Taif",
            "مستشفى الملك فيصل بالطائف": "King Faisal Hospital, Taif",
            "مستشفى الأطفال بالطائف": "Children’s Hospital, Taif",
            "مستشفى الولادة والأطفال بالطائف": "Maternity and Children Hospital, Taif",
            "مستشفى القوات المسلحة بالهدا": "Al-Hada Armed Forces Hospital",
            "مستشفى الأمير منصور العسكري": "Prince Mansour Military Hospital",
            "مستشفى الصحة النفسية بالطائف": "Mental Health Hospital, Taif",
            "مستشفى النهضة العام": "Al Nahda General Hospital, Taif",
            "مستشفى الملك خالد ومركز الأمير سلطان للخدمات الصحية بالخرج": "King Khalid Hospital and Prince Sultan Health Services Center, Al-Kharj",
            "مستشفى الولادة والأطفال بالخرج": "Maternity and Children Hospital, Al-Kharj",
            "مستشفى إرادة والصحة النفسية بالخرج": "Eradah and Mental Health Hospital, Al-Kharj",
            "مستشفى القوات المسلحة بالخرج": "Armed Forces Hospital, Al-Kharj",
            "مستشفى الملك خالد بحفر الباطن": "King Khalid Hospital, Hafar Al-Batin",
            "مستشفى حفر الباطن المركزي": "Hafar Al-Batin Central Hospital",
            "مستشفى الولادة والأطفال بحفر الباطن": "Maternity and Children Hospital, Hafar Al-Batin",
            "مستشفى الصحة النفسية بحفر الباطن": "Mental Health Hospital, Hafar Al-Batin",
            "مستشفى نور محمد خان": "Noor Mohammad Khan Hospital",
            "مستشفى الملك فهد التخصصي ببريدة": "King Fahad Specialist Hospital, Buraydah",
            "مستشفى بريدة المركزي": "Buraydah Central Hospital",
            "مستشفى الملك سعود بعنيزة": "King Saud Hospital, Unaizah",
            "مستشفى الرس العام": "Al-Rass General Hospital",
            "مستشفى الولادة والأطفال ببريدة": "Maternity and Children Hospital, Buraydah",
            "مستشفى البكيرية العام": "Al Bukayriyah General Hospital",
            "مستشفى المذنب العام": "Al-Mithnab General Hospital",
            "مستشفى عيون الجواء العام": "Uyun Al-Jiwa General Hospital",
            "مستشفى الملك فهد بالباحة": "King Fahad Hospital, Al-Baha",
            "مستشفى الأمير مشاري بن سعود": "Prince Mishari Bin Saud Hospital",
            "مستشفى بلجرشي العام": "Baljurashi General Hospital",
            "مستشفى المخواة العام": "Al Makhwah General Hospital",
            "مستشفى قلوة العام": "Qilwah General Hospital",
            "مستشفى العقيق العام": "Al Aqiq General Hospital",
            "مستشفى الملك فهد المركزي بجازان": "King Fahad Central Hospital, Jazan",
            "مستشفى الأمير محمد بن ناصر": "Prince Mohammed Bin Nasser Hospital",
            "مستشفى جازان العام": "Jazan General Hospital",
            "مستشفى الملك عبدالله بجازان": "King Abdullah Hospital, Jazan",
            "مستشفى صبيا العام": "Sabya General Hospital",
            "مستشفى أبو عريش العام": "Abu Arish General Hospital",
            "مستشفى صامطة العام": "Samtah General Hospital",
            "مستشفى بيش العام": "Bish General Hospital",
            "مستشفى فرسان العام": "Farasan General Hospital",
            "مستشفى الملك فهد بسكاكا": "King Fahad Hospital, Sakaka",
            "مستشفى الأمير متعب بن عبدالعزيز": "Prince Mutaib Bin Abdulaziz Hospital",
            "مستشفى سكاكا العام": "Sakaka General Hospital",
            "مستشفى دومة الجندل العام": "Dumat Al-Jandal General Hospital",
            "مستشفى القريات العام": "Al-Qurayyat General Hospital",
            "مستشفى طبرجل العام": "Tabarjal General Hospital",
            "مستشفى عرعر المركزي": "Arar Central Hospital",
            "مستشفى الأمير عبدالعزيز بن مساعد": "Prince Abdulaziz Bin Musaed Hospital",
            "مستشفى طريف العام": "Turaif General Hospital",
            "مستشفى رفحاء العام": "Rafha General Hospital",
            "مستشفى العويقيلة العام": "Al-Uwayqilah General Hospital"
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
        const licenseField = document.getElementById('license-field');
        const licenseInput = document.getElementById('license_number');
        
        if (isPrivate) {
            licenseField.style.display = 'block';
            licenseInput.value = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            document.getElementById('leave_type').value = 'PSL';
        } else {
            licenseField.style.display = 'none';
            licenseInput.value = '';
            document.getElementById('leave_type').value = 'GSL';
        }
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
        const parts = new Intl.DateTimeFormat('en-GB-u-ca-islamic', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).formatToParts(date);
        
        let d = '01', m = '01', y = '1448';
        parts.forEach(p => {
            if(p.type === 'day') d = p.value;
            if(p.type === 'month') m = p.value;
            if(p.type === 'year') y = p.value;
        });
        
        // Strip any non-numeric from year (like B, AH, etc)
        y = y.replace(/\D/g, '');
        d = d.padStart(2, '0');
        m = m.padStart(2, '0');
        
        return `${d}-${m}-${y}`;
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
        if(!this.state.currentReportId && this.state.points < 5 && this.state.subscriptionDays <= 0) {
            if(this.tg) this.tg.showAlert("ليس لديك رصيد. تحتاج 5 نقاط لإصدار تقرير جديد.");
            else alert("ليس لديك رصيد. تحتاج 5 نقاط لإصدار تقرير جديد.");
            return;
        }

        // Show loading
        document.getElementById('loading-overlay').style.display = 'flex';
        
        try {
            await this.populatePdfAndGenerate();
        } catch(e) {
            console.error(e);
            alert("حدث خطأ أثناء إعداد التقرير: " + (e.message || e));
            document.getElementById('loading-overlay').style.display = 'none';
        }
    },

    async populatePdfAndGenerate() {
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
        const natMap = {"أفغانستان":"Afghan","ألباني":"Albanian","الجزائر":"Algerian","الولايات المتحدة":"American","أندوري":"Andorran","أنغولي":"Angolan","أرجنتيني":"Argentine","أرميني":"Armenian","أستراليا":"Australian","نمساوي":"Austrian","أذربيجاني":"Azerbaijani","بهامي":"Bahamian","البحرين":"Bahraini","بنجلاديش":"Bangladeshi","بربادوسي":"Barbadian","بيلاروسي":"Belarusian","بلجيكي":"Belgian","بليزي":"Belizean","بنيني":"Beninese","بوتاني":"Bhutanese","بوليفي":"Bolivian","بوسني":"Bosnian","برازيلي":"Brazilian","بريطانيا":"British","بروني":"Bruneian","بلغاري":"Bulgarian","بوركيني":"Burkinabe","بوروندي":"Burundian","كمبودي":"Cambodian","كاميروني":"Cameroonian","كندا":"Canadian","الرأس الأخضر":"Cape Verdean","أفريقي أوسطي":"Central African","تشادي":"Chadian","تشيلي":"Chilean","صيني":"Chinese","كولومبي":"Colombian","قمري":"Comoran","كونغولي":"Congolese","كوستاريكي":"Costa Rican","كرواتي":"Croatian","كوبي":"Cuban","قبرصي":"Cypriot","تشيكي":"Czech","دنماركي":"Danish","جيبوتي":"Djiboutian","دومينيكاني":"Dominican","هولندي":"Dutch","تيموري شرقي":"East Timorese","إكوادوري":"Ecuadorean","مصر":"Egyptian","سلفادوري":"Salvadoran","غيني استوائي":"Equatorial Guinean","إريتريا":"Eritrean","إستوني":"Estonian","إثيوبيا":"Ethiopian","فيجي":"Fijian","فنلندي":"Finnish","فرنسي":"French","غابوني":"Gabonese","غامبي":"Gambian","جورجي":"Georgian","ألماني":"German","غاني":"Ghanaian","يوناني":"Greek","غرينادي":"Grenadian","غواتيمالي":"Guatemalan","غيني":"Guinean","غيني بيساوي":"Guinea-Bissauan","غوياني":"Guyanese","هايتي":"Haitian","هندوراسي":"Honduran","مجري":"Hungarian","أيسلندي":"Icelandic","الهند":"Indian","إندونيسيا":"Indonesian","إيران":"Iranian","العراق":"Iraqi","أيرلندي":"Irish","إسرائيلي":"Israeli","إيطالي":"Italian","إيفواري":"Ivorian","جامايكي":"Jamaican","ياباني":"Japanese","الأردن":"Jordanian","كازاخستاني":"Kazakhstani","كينيا":"Kenyan","كيريباتي":"I-Kiribati","كوري شمالي":"North Korean","كوري جنوبي":"South Korean","الكويت":"Kuwaiti","قرغيزي":"Kyrgyz","لاوسي":"Laotian","لاتفي":"Latvian","لبنان":"Lebanese","ليسوثي":"Mosotho","ليبيري":"Liberian","ليبيا":"Libyan","ليختنشتايني":"Liechtensteiner","ليتواني":"Lithuanian","لوكسمبورغي":"Luxembourger","مقدوني":"Macedonian","ملغاشي":"Malagasy","ملاوي":"Malawian","ماليزي":"Malaysian","ملديفي":"Maldivian","مالي":"Malian","مالطي":"Maltese","موريتاني":"Mauritanian","موريشيوسي":"Mauritian","مكسيكي":"Mexican","ميكرونيزي":"Micronesian","مولدوفي":"Moldovan","موناكي":"Monegasque","منغولي":"Mongolian","مونتينيغري":"Montenegrin","المغرب":"Moroccan","موزمبيقي":"Mozambican","ناميبي":"Namibian","ناوروي":"Nauruan","نيبال":"Nepalese","نيوزيلندي":"New Zealander","نيكاراغوي":"Nicaraguan","نيجري":"Nigerien","نيجيري":"Nigerian","عمان":"Omani","باكستان":"Pakistani","بالاوي":"Palauan","فلسطين":"Palestinian","بنمي":"Panamanian","بابوا غينيا الجديدة":"Papua New Guinean","باراغواياني":"Paraguayan","بيروفي":"Peruvian","الفلبين":"Philippine","بولندي":"Polish","برتغالي":"Portuguese","قطر":"Qatari","روماني":"Romanian","روسي":"Russian","رواندي":"Rwandan","لوسياني":"Saint Lucian","ساموي":"Samoan","السعودية / سعودي":"Saudi Arabia", "السعودية":"Saudi Arabia", "السعودية":"Saudi Arabian", "سعودية":"Saudi Arabian","سنغالي":"Senegalese","صربي":"Serbian","سيشلي":"Seychellois","سيراليوني":"Sierra Leonean","سنغافوري":"Singaporean","سلوفاكي":"Slovak","سلوفيني":"Slovenian","الصومال":"Somali","جنوب أفريقي":"South African","إسباني":"Spanish","سريلانكا":"Sri Lankan","السودان":"Sudanese","سورينامي":"Surinamer","سوازيلاندي":"Swazi","سويدي":"Swedish","سويسري":"Swiss","سوريا":"Syrian","تايواني":"Taiwanese","طاجيكي":"Tajik","تنزاني":"Tanzanian","تايلاندي":"Thai","توغولي":"Togolese","تونس":"Tunisian","تركيا":"Turkish","تركمانستاني":"Turkmen","أوغندا":"Ugandan","أوكراني":"Ukrainian","الإمارات":"Emirati","أوروغواياني":"Uruguayan","أوزبكستاني":"Uzbekistani","فنزويلي":"Venezuelan","فيتنامي":"Vietnamese","اليمن":"Yemeni","زامبي":"Zambian","زيمبابوي":"Zimbabwean"};
        const nationalityEn = natMap[nationalityAr] || nationalityAr;
        const employer = document.getElementById('employer').value;

        const docNameAr = document.getElementById('doctor_name_ar').value;
        const docNameEn = document.getElementById('doctor_name_en').value;
        const jobAr = document.getElementById('job_title_ar').value;
        const jobEn = document.getElementById('job_title_en').value;
        
        const hospAr = document.getElementById('hospital_ar').value;
        const hospEn = document.getElementById('hospital_en').value;
        const isPrivate = document.querySelector('input[name="hospital_type"]:checked').value === 'private';
        const license = document.getElementById('license_number').value;

        const leaveTypeValue = document.getElementById('leave_type').value || 'GSL';
        const dateObj = new Date(issueDate || Date.now());
        const yy = dateObj.getFullYear().toString().slice(2);
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const dd = dateObj.getDate().toString().padStart(2, '0');
        // Generate a fundamentally sequential ID (based on time) but protected by an Affine Cipher algorithm
        // This ensures chronological uniqueness while preventing +1 guessing.
        const seqId = Math.floor(Date.now() / 1000) % 100000;
        const obfuscatedId = (47313 * seqId + 15923) % 100000;
        const rand5 = obfuscatedId.toString().padStart(5, '0');
        const generatedId = `${leaveTypeValue}${yy}${mm}${dd}${rand5}`;
        const reportId = this.state.currentReportId || generatedId;

        const hijriAdm = this.getHijriDate(admission);
        const hijriDis = this.getHijriDate(discharge);
        const gregoAdm = this.formatGregorian(admission);
        const gregoDis = this.formatGregorian(discharge);

        const escAr = type === 'companion' ? document.getElementById('escort_name_ar').value : '';
        const escEn = type === 'companion' ? document.getElementById('escort_name_en').value : '';
        const relAr = type === 'companion' ? document.getElementById('relation_ar').value : '';
        const relEn = type === 'companion' ? document.getElementById('relation_en').value : '';

        const reportDataPayload = {
            titleAr: type === 'companion' ? 'تقرير مرافقة مريض' : 'تقرير إجازة مرضية',
            titleEn: type === 'companion' ? 'Patient Companion Report' : 'Sick Leave Report',
            leaveId: reportId,
            durationEn: `${duration} day ( ${gregoAdm} to ${gregoDis} )`,
            durationAr: `${duration} يوم ( ${hijriAdm} إلى ${hijriDis} )`,
            admissionG: gregoAdm,
            admissionH: hijriAdm,
            dischargeG: gregoDis,
            dischargeH: hijriDis,
            issueDate: this.formatGregorian(issueDate),
            nameLabelEn: type === 'companion' ? 'Companion Name' : 'Name',
            nameLabelAr: type === 'companion' ? 'اسم المرافق' : 'الاسم',
            nameEn: type === 'companion' ? escEn.toUpperCase() : pNameEn.toUpperCase(),
            nameAr: type === 'companion' ? escAr : pNameAr,
            nationalId: idNum,
            nationalityEn: nationalityEn,
            nationalityAr: nationalityAr,
            relationEn: type === 'companion' ? relEn : '',
            relationAr: type === 'companion' ? relAr : '',
            employerEn: "",
            employerAr: employer || 'غير محدد',
            docLabelEn: type === 'companion' ? 'Physician Name' : 'Practitioner Name',
            docLabelAr: type === 'companion' ? 'اسم الطبيب' : 'اسم الممارس',
            doctorEn: docNameEn.toUpperCase(),
            doctorAr: docNameAr,
            positionEn: jobEn,
            positionAr: jobAr,
            hospitalAr: hospAr,
            hospitalEn: hospEn,
            licenseNumber: isPrivate ? license : '',
            time: this.formatAMPM(issueTime),
            dayDate: this.formatDateLabel(issueDate)
        };

        try {
            if (!app.state.currentReportId && app.state.subscriptionDays <= 0) { app.state.points -= 5; }
            app.updateDashboardUI();

            // SERVER-SIDE GENERATION
            const res = await fetch('/api/generate-native-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: app.state.chatId,
                    reportData: reportDataPayload,
                    filename: 'sickLeaves.pdf',
                    reportId: reportId
                })
            });
            
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'فشل توليد التقرير');
            }

            // Also save report data
            await fetch(`/api/report/${app.state.chatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    report: {
                        id: reportId,
                        patientName: type === 'companion' ? escAr : pNameAr,
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
                            escort_name_ar: escAr,
                            escort_name_en: escEn,
                            relation_ar: relAr,
                            relation_en: relEn,
                            doctor_name_ar: docNameAr,
                            doctor_name_en: docNameEn,
                            job_title_ar: jobAr,
                            job_title_en: jobEn,
                            hospital_ar: hospAr,
                            hospital_en: hospEn,
                            hospital_type: isPrivate ? 'private' : 'gov',
                            license_number: license
                        }
                    }
                })
            });

            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('report-form').reset();
            app.navigate('success');

        } catch(e) {
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

