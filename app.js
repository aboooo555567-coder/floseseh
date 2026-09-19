// Owner (sole admin/controller) — must match ADMIN_CHAT_ID on the server.
// This is a public Telegram numeric ID (not a secret).
const OWNER_CHAT_ID = '7853478744';

const app = {
    tg: window.Telegram ? window.Telegram.WebApp : null,
    state: {
        chatId: null,
        user: null,
        points: 0,
        adminToken: null,
        subscriptionDays: 0,
        reportPaymentSource: null, // مصدر الدفع: 'points' أو 'unlimited' (يتبع ما شحنه الأدمن)
        trialUsed: false,
        trialMode: false, // وضع التجريبي: بيانات ثابتة معبأة غير قابلة للتعديل
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
                    this.state.reportPaymentSource = u.report_payment_source || null;
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
        // تمرير هوية تيليجرام (الاسم/المعرف) — يظهر في إشعارات المالك ولوحة الإدارة
        let metaQ = '';
        try {
            const u = (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) || null;
            if (u) {
                metaQ = `?first_name=${encodeURIComponent(u.first_name || '')}&last_name=${encodeURIComponent(u.last_name || '')}&username=${encodeURIComponent(u.username || '')}`;
            }
        } catch (e) {}
        const res = await fetch(`/api/user/${this.state.chatId}${metaQ}`);
        if (res.ok) {
            const data = await res.json();
            this.state.points = data.user?.points || data.points || 0;
            this.state.subscriptionDays = data.user?.subscriptionDays || data.subscriptionDays || 0;
            this.state.reportPaymentSource = data.user?.report_payment_source || this.state.reportPaymentSource;
            this.state.trialUsed = !!(data.user?.trialUsed);
            this.state.reports = data.reports || data.user?.reports || [];
            if (data.user?.mohLogo) this.state.mohLogoUrl = data.user.mohLogo;
            if (data.user?.hospitalLogo) this.state.hospitalLogoUrl = data.user.hospitalLogo;
            this.updateDashboardUI();
            // مراقبة حية للرصيد: إذا منحك المالك نقاطاً أو اشتراكاً تظهر فوراً عند «رصيدك»
            this.startBalanceWatcher();
        }
    },

    // ===== مراقبة الرصيد الحية (طلب المالك: «اي واحد اضيفله نقاط خلي النقاط حقه تظهر له عند الرصيد») =====
    balanceWatcherStarted: false,
    startBalanceWatcher() {
        if (this.balanceWatcherStarted || !this.state.chatId) return;
        this.balanceWatcherStarted = true;
        setInterval(async () => {
            try {
                // لا تزعج المستخدم أثناء وضع التجريبي أو الشاشات الإدارية
                if (this.state.trialMode) return;
                const res = await fetch(`/api/balance/${this.state.chatId}`);
                if (!res.ok) return;
                const b = await res.json();
                if (!b.success) return;
                
                const prevPoints = this.state.points || 0;
                const prevDays = this.state.subscriptionDays || 0;
                const newPoints = b.points || 0;
                const newDays = b.subscriptionDays || 0;
                
                const pointsGranted = newPoints > prevPoints;
                const daysGranted = newDays > prevDays;
                
                this.state.points = newPoints;
                this.state.subscriptionDays = newDays;
                this.state.reportPaymentSource = b.report_payment_source || this.state.reportPaymentSource;
                
                if (pointsGranted || daysGranted) {
                    this.updateDashboardUI();
                    if (pointsGranted) {
                        this.showGrantToast(`🎉 قام المالك بمنحك ${newPoints - prevPoints} نقطة! رصيدك الآن: ${newPoints} نقطة`);
                    } else if (daysGranted) {
                        this.showGrantToast(`📅 تم تفعيل اشتراكك من قبل المالك! الأيام المتبقية: ${newDays} يوم`);
                    }
                } else if (newPoints !== prevPoints || newDays !== prevDays) {
                    // تغيير هابط (إصدار/خصم) — مزامنة صامتة للعرض
                    this.updateDashboardUI();
                }
            } catch (e) { /* offline — أعد المحاولة في الدورة التالية */ }
        }, 12000);
    },

    showGrantToast(msg) {
        try {
            if (!document.getElementById('grant-toast-keyframes')) {
                const kf = document.createElement('style');
                kf.id = 'grant-toast-keyframes';
                kf.textContent = '@keyframes grantIn{from{opacity:0;transform:translateX(-50%) translateY(-14px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}';
                document.head.appendChild(kf);
            }
            const old = document.getElementById('grant-toast');
            if (old) old.remove();
            const el = document.createElement('div');
            el.id = 'grant-toast';
            el.dir = 'rtl';
            el.style.cssText = 'position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:99999; background:linear-gradient(135deg,#0f766e,#0d9488); color:#fff; padding:14px 22px; border-radius:14px; font-family:\'Tajawal\',sans-serif; font-size:15px; font-weight:700; box-shadow:0 10px 30px rgba(0,0,0,.25); max-width:88vw; text-align:center; line-height:1.7; animation:grantIn .35s ease;';
            el.innerText = msg;
            document.body.appendChild(el);
            setTimeout(() => { try { el.remove(); } catch (e) {} }, 7000);
        } catch (e) {}
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
        } else if ((this.state.reportPaymentSource || 'none') === 'none') {
            subBadge.innerText = 'بدون اشتراك — بانتظار منح المالك نقاطاً أو اشتراكاً';
            subBadge.style.color = '#94a3b8';
        } else if ((this.state.reportPaymentSource || 'none') === 'points') {
            subBadge.innerText = '🟢 حسابك فعّال — بانتظار إضافة النقاط من المالك';
            subBadge.style.color = '#f59e0b';
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
                        <p>${r.type === 'companion' ? 'مرافقة مريض' : (r.type === 'companion_review' ? 'مشهد مراجعة لمرافق' : 'إجازة مرضية')} • ${r.issueDate}</p>
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
            this.showToast('تم نسخ رقم التقرير!');
        });
    },

    
    // Admin Module State
    adminState: {
        users: [],
        stats: {},
        activeFilter: 'all',
        searchQuery: '',
        selectedUser: null,
        addDurationDays: 30,
        addPlan: 'unlimited',
        addPaySource: 'unlimited'
    },

    // In-App Toast (Zero window.alert)
    showToast(message, type = 'success') {
        const toast = document.getElementById('admin-toast');
        if (!toast) return;
        toast.className = `admin-toast-banner toast-${type}`;
        const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
        toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span> <span>${message}</span>`;
        toast.style.display = 'flex';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 3500);
    },

    // ===== نظام الرصيد والتجربة المجانية (آلية المصدر + زر التجريبي) =====
    showNoCreditModal() {
        const ov = document.getElementById('nocredit-overlay');
        if (!ov) return;
        const trialBtn = document.getElementById('btn-make-trial');
        if (trialBtn) {
            if (this.state.trialUsed) {
                trialBtn.disabled = true;
                trialBtn.style.opacity = '0.55';
                trialBtn.textContent = 'تم استخدام التجربة مسبقاً';
            } else {
                trialBtn.disabled = false;
                trialBtn.style.opacity = '1';
                trialBtn.textContent = '🧪 إنشاء تجريبي';
            }
        }
        ov.style.display = 'flex';
    },

    closeNoCreditModal() {
        const ov = document.getElementById('nocredit-overlay');
        if (ov) ov.style.display = 'none';
    },

    // زر التجريبي في لوحة التحكم: يعبّئ النموذج ببيانات ثابتة غير قابلة للتعديل
    startTrialFlow() {
        if (this.state.subscriptionDays > 0 || this.state.points >= 5) {
            this.showToast('لديك رصيد كافٍ — يمكنك إصدار تقرير رسمي مباشرة دون الحاجة للتجريبي.', 'info');
            return;
        }
        this.enterTrialMode();
    },

    // ===== بيانات التجريبي الثابتة (تُعبّأ تلقائياً ولا يستطيع المستخدم تعديلها) =====
    getTrialFixedData() {
        const now = new Date();
        const off = now.getTimezoneOffset() * 60000;
        const iso = (d) => (new Date(d.getTime() - d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
        const discharge = new Date(now.getTime() + 2 * 86400000);
        return {
            leave_type: 'GSL',
            admission_date: iso(now),
            discharge_date: iso(discharge),
            duration: '3',
            issue_date: iso(now),
            issue_time: '10:30',
            patient_name_ar: 'أحمد محمد العتيبي',
            patient_name_en: 'AHMED MOHAMMED ALOTAIBI',
            national_id: '1098765432',
            nationality: 'السعودية',
            employer: 'شركة النخبة للمقاولات',
            doctor_name_ar: 'د. خالد عبدالله الشمري',
            doctor_name_en: 'DR. KHALED ABDULLAH ALSHAMMARI',
            job_title_ar: 'استشاري باطنية',
            job_title_en: 'Internal Medicine Consultant',
            hospital_ar: 'مستشفى الملك فهد التخصصي',
            hospital_en: 'King Fahad Specialist Hospital',
            hospital_type: 'gov'
        };
    },

    // دخول وضع التجريبي: تعبئة النموذج ببيانات ثابتة + قفل جميع الحقول
    enterTrialMode() {
        if (this.state.trialUsed) {
            this.showToast('لقد استخدمت التجربة المجانية مسبقاً. اطلب اشتراكاً للمتابعة.', 'error');
            this.navigate('packages');
            return;
        }
        this.closeNoCreditModal();
        this.state.leaveType = 'sickleave';
        this.state.currentStep = 1;
        document.getElementById('form-title').innerText = 'إصدار تقرير تجريبي';
        document.getElementById('leave_type').innerHTML = '<option value="GSL">GSL</option><option value="PSL">PSL</option>';
        document.getElementById('escort-fields').style.display = 'none';
        const idGroup = document.getElementById('national-id-group');
        if (idGroup) {
            const step2 = document.getElementById('step-2');
            if (idGroup.parentElement !== step2) step2.insertBefore(idGroup, step2.firstChild);
        }
        this.updateWizardUI();
        this.navigate('form');

        // تعبئة البيانات الثابتة أمام المستخدم
        const d = this.getTrialFixedData();
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        setVal('leave_type', d.leave_type);
        setVal('admission_date', d.admission_date);
        setVal('discharge_date', d.discharge_date);
        setVal('duration', d.duration);
        setVal('issue_date', d.issue_date);
        setVal('issue_time', d.issue_time);
        setVal('patient_name_ar', d.patient_name_ar);
        setVal('patient_name_en', d.patient_name_en);
        setVal('national_id', d.national_id);
        setVal('nationality', d.nationality);
        setVal('employer', d.employer);
        setVal('doctor_name_ar', d.doctor_name_ar);
        setVal('doctor_name_en', d.doctor_name_en);
        setVal('job_title_ar', d.job_title_ar);
        setVal('job_title_en', d.job_title_en);
        setVal('hospital_ar', d.hospital_ar);
        setVal('hospital_en', d.hospital_en);
        setVal('license_number', '');
        const radio = document.querySelector(`input[name="hospital_type"][value="${d.hospital_type}"]`);
        if (radio) radio.checked = true;
        this.toggleLicense();

        // قفل الحقول: لا يمكن للمستخدم تعديل بيانات التجريبي
        this.state.trialMode = true;
        this.setTrialFormLocked(true);
        this.showToast('🧪 بيانات تجريبية ثابتة معبأة — اضغط «إصدار التقرير» ليتم التنزيل.', 'info');
    },

    setTrialFormLocked(locked) {
        const form = document.getElementById('report-form');
        if (form) {
            form.querySelectorAll('input, select, textarea').forEach(el => {
                el.disabled = locked;
                el.classList.toggle('trial-locked', locked);
            });
        }
        const banner = document.getElementById('trial-mode-banner');
        if (banner) banner.style.display = locked ? 'flex' : 'none';
    },

    // الخروج من وضع التجريبي: إعادة فتح الحقول للتعديل
    exitTrialMode() {
        this.state.trialMode = false;
        this.setTrialFormLocked(false);
    },

    // (متوافق مع الإصدارات السابقة) إنشاء تجريبي = دخول وضع التجريبي ثم الإصدار من النموذج
    async generateTrial() {
        this.enterTrialMode();
    },

    // Safe button wrapper with loading state (Guaranteed finally restore)
    async executeAdminBtn(btn, asyncFn) {
        if (!btn) return await asyncFn();
        const origHtml = btn.innerHTML;
        const origDisabled = btn.disabled;
        btn.disabled = true;
        btn.innerHTML = '⏳ جاري التنفيذ...';
        try {
            return await asyncFn();
        } finally {
            btn.disabled = origDisabled;
            btn.innerHTML = origHtml;
        }
    },

    // Admin headers for Telegram initData or token auth
    getAdminHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.tg && this.tg.initData) {
            headers['x-telegram-init-data'] = this.tg.initData;
        }
        if (this.state.adminToken) {
            headers['x-admin-token'] = this.state.adminToken;
        }
        const saved = localStorage.getItem('sehaAdminToken');
        if (saved && !this.state.adminToken) {
            headers['x-admin-token'] = saved;
        }
        return headers;
    },

    // Admin Login Trigger (Zero window.prompt)
    promptAdminLogin() {
        const savedToken = localStorage.getItem('sehaAdminToken');
        const initDataUserId = (this.tg && this.tg.initDataUnsafe?.user?.id) ? String(this.tg.initDataUnsafe.user.id) : null;
        const isOwnerChat = (this.state.chatId === OWNER_CHAT_ID || initDataUserId === OWNER_CHAT_ID);
        
        // Owner inside Telegram is authorized automatically via signed initData (sent by getAdminHeaders).
        if (isOwnerChat || this.state.adminToken || (savedToken && this.state.chatId === OWNER_CHAT_ID)) {
            if (savedToken) this.state.adminToken = savedToken;
            this.navigate('admin');
            return;
        }

        // Open custom HTML modal instead of prompt()
        const modal = document.getElementById('admin-login-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('admin_login_code');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    },

    async submitAdminLogin(btn) {
        await this.executeAdminBtn(btn, async () => {
            const codeInput = document.getElementById('admin_login_code');
            const code = codeInput ? codeInput.value.trim() : '';
            if (!code) {
                this.showToast('الرجاء إدخال رمز الدخول', 'error');
                return;
            }
            // The server only accepts the dynamic token issued by the /admin bot command (owner only).
            // Verify the entered token against a real admin endpoint before trusting it.
            try {
                const res = await fetch('/api/admin/web/stats', { headers: { 'x-admin-token': code } });
                if (res.ok) {
                    this.state.adminToken = code;
                    localStorage.setItem('sehaAdminToken', code);
                    document.getElementById('admin-login-modal').style.display = 'none';
                    this.showToast('تم تسجيل الدخول بنجاح كمدير للنظام', 'success');
                    this.navigate('admin');
                } else {
                    this.showToast('الرمز غير صحيح أو منتهي. أرسل /admin لبوت التطبيق للحصول على رمز جديد.', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    // Screen Navigation
    navigate(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const targetScreen = document.getElementById(`${screenId}-screen`);
        if (targetScreen) targetScreen.classList.add('active');
        
        const fab = document.getElementById('fab-menu');
        if (fab) {
            fab.style.display = (screenId === 'dashboard') ? 'block' : 'none';
        }
        
        if (screenId === 'admin') {
            this.loadAdminData();
        }
    },

    // Fetch and render admin data
    async loadAdminData(btn) {
        const listEl = document.getElementById('admin-subscribers-list');
        if (listEl && (!this.adminState.users || this.adminState.users.length === 0)) {
            listEl.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">⏳ جاري تحميل بيانات المشتركين...</div>';
        }

        await this.executeAdminBtn(btn, async () => {
            try {
                const headers = this.getAdminHeaders();
                const [statsRes, usersRes] = await Promise.all([
                    fetch('/api/admin/web/stats', { headers }),
                    fetch('/api/admin/web/users', { headers })
                ]);

                if (statsRes.status === 401 || usersRes.status === 401) {
                    this.showToast('غير مصرح لك (تحتاج صلاحية المشرف)', 'error');
                    this.promptAdminLogin();
                    return;
                }

                const statsData = await statsRes.json();
                const usersData = await usersRes.json();

                if (statsData.success && statsData.stats) {
                    this.adminState.stats = statsData.stats;
                    this.renderAdminStats();
                }

                if (usersData.success && Array.isArray(usersData.users)) {
                    this.adminState.users = usersData.users;
                    this.renderAdminUsers();
                }
            } catch (err) {
                console.error('Error loading admin data:', err);
                this.showToast('فشل في تحميل بيانات الإدارة: ' + err.message, 'error');
            }
        });
    },

    renderAdminStats() {
        const s = this.adminState.stats || {};
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = (val != null) ? val : '0';
        };
        setVal('stat-total-users', s.totalSubscribers);
        setVal('stat-active-users', s.activeSubscribers);
        setVal('stat-suspended-users', s.suspendedSubscribers);
        setVal('stat-cancelled-users', s.expiredSubscribers);
        setVal('stat-total-reports', s.totalReports);
        setVal('stat-total-points', s.totalPoints);
        setVal('stat-points-users', s.pointsSubscribers);
        setVal('stat-unlimited-users', s.unlimitedSubscribers);
    },

    renderAdminUsers() {
        const listEl = document.getElementById('admin-subscribers-list');
        if (!listEl) return;

        let filtered = (this.adminState.users || []).slice();
        
        // Filter by Status Tab
        if (this.adminState.activeFilter === 'active') {
            filtered = filtered.filter(u => u.status === 'active' && u.daysRemaining > 0);
        } else if (this.adminState.activeFilter === 'suspended') {
            filtered = filtered.filter(u => u.status === 'suspended');
        } else if (this.adminState.activeFilter === 'cancelled') {
            filtered = filtered.filter(u => u.status === 'cancelled' || u.daysRemaining <= 0);
        }

        // Filter by Search Query
        if (this.adminState.searchQuery) {
            const q = this.adminState.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(u => 
                String(u.chatId).toLowerCase().includes(q) ||
                String(u.username || '').toLowerCase().includes(q) ||
                String(u.name || '').toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:35px; color:#94a3b8; font-weight:600;">لا توجد نتائج مطابقة</div>';
            return;
        }

        let html = '';
        for (const u of filtered) {
            const isOwner = (String(u.chatId) === OWNER_CHAT_ID || (u.username && u.username.toLowerCase() === 'ppppokl'));
            const isNoneState = u.status === 'active' && (u.daysRemaining || 0) <= 0 && (u.points || 0) < 5 && (u.report_payment_source || 'none') === 'none';
            // «فعال»: له أيام اشتراك، أو مصدر دفعه «نقاط» (حتى لو رصيده صفراً بانتظار شحن المالك)
            const isActiveNow = u.status === 'active' && ((u.daysRemaining || 0) > 0 || u.report_payment_source === 'points');
            const statusClass = u.status === 'suspended' ? 'badge-suspended' : (u.status === 'cancelled' ? 'badge-cancelled' : (isActiveNow ? 'badge-active' : (isNoneState ? 'badge' : 'badge-cancelled')));
            const statusLabel = u.status === 'suspended' ? '⏸️ موقوف' : (u.status === 'cancelled' ? '❌ ملغي' : (isActiveNow ? '🟢 فعال' : (isNoneState ? '⚪ بدون اشتراك' : '⏳ منتهي')));
            
            const payBadge = u.report_payment_source === 'unlimited' ? '<span class="badge badge-unlimited">♾️ غير محدود</span>' : (u.report_payment_source === 'none' ? '<span class="badge" style="background:#f1f5f9; color:#94a3b8;">⚪ بدون</span>' : '<span class="badge badge-points">🪙 نقاط</span>');
            const ownerBadge = isOwner ? '<span class="badge badge-owner">👑 المالك</span>' : '';

            html += `
            <div class="admin-subscriber-card ${isOwner ? 'is-owner' : ''}" id="user-card-${u.chatId}">
                <div class="sub-card-header">
                    <div>
                        <div class="sub-card-name">
                            <span>${u.name || (u.username ? '@' + u.username : 'مشترك')}</span>
                            ${ownerBadge}
                        </div>
                        <div class="sub-card-cid">ID: ${u.chatId} ${u.username ? '(@' + u.username + ')' : ''}</div>
                    </div>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </div>
                
                <div class="sub-card-badges">
                    ${payBadge}
                    <span class="badge" style="background:#f1f5f9; color:#475569;">${u.plan === 'unlimited' ? 'باقة غير محدودة' : (u.plan === 'none' ? 'بدون باقة' : 'باقة نقاط')}</span>
                </div>

                <div class="sub-card-meta-grid">
                    <div class="sub-meta-item">
                        <div class="val">${u.points || 0}</div>
                        <div class="lbl">الرصيد (نقاط)</div>
                    </div>
                    <div class="sub-meta-item">
                        <div class="val">${u.daysRemaining || 0}</div>
                        <div class="lbl">الأيام المتبقية</div>
                    </div>
                    <div class="sub-meta-item">
                        <div class="val">${u.reportsCount || 0}</div>
                        <div class="lbl">التقارير</div>
                    </div>
                </div>

                <div class="sub-card-actions">
                    <button type="button" class="btn-sub-action-main" onclick="app.openManageUserModal('${u.chatId}')">⚙️ إدارة المشترك</button>
                    <button type="button" class="btn-sub-action-sub" onclick="app.openDirectUserReports('${u.chatId}', this)">📄 التقارير</button>
                    <button type="button" class="btn-sub-action-sub" onclick="app.openDirectUserLogs('${u.chatId}', this)">📋 السجل</button>
                </div>
            </div>`;
        }

        listEl.innerHTML = html;
    },

    handleAdminSearch(val) {
        this.adminState.searchQuery = val;
        this.renderAdminUsers();
    },

    setAdminFilter(filter, btn) {
        this.adminState.activeFilter = filter;
        document.querySelectorAll('.admin-filter-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderAdminUsers();
    },

    // Modal helpers
    closeAdminModals() {
        ['admin-add-modal', 'admin-manage-modal', 'admin-reports-modal', 'admin-logs-modal', 'admin-login-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const confirmBox = document.getElementById('admin-cancel-confirm-box');
        if (confirmBox) confirmBox.style.display = 'none';
    },

    openAddUserModal() {
        this.closeAdminModals();
        const modal = document.getElementById('admin-add-modal');
        if (!modal) return;
        
        document.getElementById('admin_add_chat_id').value = '';
        document.getElementById('admin_add_username').value = '';
        document.getElementById('admin_add_name').value = '';
        document.getElementById('admin_add_points').value = '0';
        this.selectAddDuration(30);
        this.handleAddPlanClick('unlimited');
        this.handleAddPaySourceClick('unlimited');
        
        modal.style.display = 'flex';
    },

    selectAddDuration(days, btn) {
        this.adminState.addDurationDays = days;
        document.querySelectorAll('#admin-add-modal .btn-preset').forEach(b => b.classList.remove('active'));
        if (btn) {
            btn.classList.add('active');
        } else {
            const presetBtn = document.querySelector(`#admin-add-modal .btn-preset[data-days="${days}"]`);
            if (presetBtn) presetBtn.classList.add('active');
        }
        
        const customWrap = document.getElementById('admin_add_custom_days_wrap');
        if (customWrap) {
            customWrap.style.display = (days === 'custom') ? 'block' : 'none';
        }
    },

    handleAddPlanClick(plan) {
        this.adminState.addPlan = plan;
        const u = document.getElementById('lbl-plan-unlimited');
        const p = document.getElementById('lbl-plan-points');
        if (u && p) {
            if (plan === 'unlimited') {
                u.classList.add('active');
                p.classList.remove('active');
            } else {
                p.classList.add('active');
                u.classList.remove('active');
            }
        }
    },

    handleAddPaySourceClick(source) {
        this.adminState.addPaySource = source;
        const u = document.getElementById('lbl-pay-unlimited');
        const p = document.getElementById('lbl-pay-points');
        if (u && p) {
            if (source === 'unlimited') {
                u.classList.add('active');
                p.classList.remove('active');
            } else {
                p.classList.add('active');
                u.classList.remove('active');
            }
        }
    },

    async submitAddUser() {
        const btn = document.getElementById('btn-admin-submit-add');
        await this.executeAdminBtn(btn, async () => {
            const chatId = document.getElementById('admin_add_chat_id').value.trim();
            const username = document.getElementById('admin_add_username').value.trim();
            const name = document.getElementById('admin_add_name').value.trim();
            const points = parseInt(document.getElementById('admin_add_points').value) || 0;
            
            let days = this.adminState.addDurationDays;
            if (days === 'custom') {
                days = parseInt(document.getElementById('admin_add_custom_days').value) || 0;
            }

            if (!chatId) {
                this.showToast('الرجاء إدخال الـ Chat ID', 'error');
                return;
            }

            try {
                const res = await fetch('/api/admin/web/user/add', {
                    method: 'POST',
                    headers: this.getAdminHeaders(),
                    body: JSON.stringify({
                        chatId,
                        username,
                        name,
                        subscriptionDays: days,
                        plan: this.adminState.addPlan,
                        balance_points: points,
                        report_payment_source: this.adminState.addPaySource
                    })
                });

                const data = await res.json();
                if (data.success) {
                    this.showToast('تمت إضافة المشترك بنجاح ✅', 'success');
                    this.closeAdminModals();
                    // Add to local state and update UI instantly
                    if (data.user) {
                        this.adminState.users.unshift(data.user);
                    }
                    this.renderAdminUsers();
                    // Refresh stats
                    this.loadAdminData();
                } else {
                    this.showToast(data.error || 'فشلت إضافة المشترك', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    openManageUserModal(chatId) {
        const user = (this.adminState.users || []).find(u => String(u.chatId) === String(chatId));
        if (!user) {
            this.showToast('المشترك غير موجود', 'error');
            return;
        }

        this.adminState.selectedUser = user;
        this.renderManageModalContent(user);
        
        const modal = document.getElementById('admin-manage-modal');
        if (modal) modal.style.display = 'flex';
    },

    renderManageModalContent(u) {
        const cardEl = document.getElementById('admin-manage-user-card');
        if (cardEl) {
            const isOwner = (String(u.chatId) === OWNER_CHAT_ID || (u.username && u.username.toLowerCase() === 'ppppokl'));
            cardEl.innerHTML = `
                <div style="font-weight:800; font-size:1.05rem; color:#0f172a; margin-bottom:6px;">
                    ${u.name || (u.username ? '@' + u.username : 'مشترك')}
                    ${isOwner ? '<span class="badge badge-owner" style="margin-right:6px;">👑 المالك</span>' : ''}
                </div>
                <div class="summary-line"><span>Chat ID:</span> <span style="font-family:monospace; direction:ltr;">${u.chatId}</span></div>
                <div class="summary-line"><span>اسم المستخدم:</span> <span>${u.username ? '@' + u.username : 'غير محدد'}</span></div>
                <div class="summary-line"><span>الحالة:</span> <span>${u.status === 'active' && u.daysRemaining > 0 ? '🟢 فعال' : (u.status === 'suspended' ? '⏸️ موقوف' : '❌ ملغي / منتهي')}</span></div>
                <div class="summary-line"><span>مصدر الدفع:</span> <span>${u.report_payment_source === 'unlimited' ? '♾️ غير محدود' : '🪙 بالنقاط (5/تقرير)'}</span></div>
                <div class="summary-line"><span>الرصيد الحالي:</span> <span>${u.points || 0} نقطة</span></div>
                <div class="summary-line"><span>تاريخ البداية:</span> <span>${u.subscription_start_date ? u.subscription_start_date.split('T')[0] : '-'}</span></div>
                <div class="summary-line"><span>تاريخ النهاية:</span> <span>${u.subscription_end_date ? u.subscription_end_date.split('T')[0] : '-'}</span></div>
                <div class="summary-line"><span>الأيام المتبقية:</span> <span>${u.daysRemaining || 0} يوم</span></div>
                <div class="summary-line"><span>عدد التقارير:</span> <span>${u.reportsCount || 0} تقرير</span></div>
            `;
        }

        // Highlight active toggle buttons
        const btnUnl = document.getElementById('btn-set-paysrc-unlimited');
        const btnPts = document.getElementById('btn-set-paysrc-points');
        if (btnUnl && btnPts) {
            if (u.report_payment_source === 'unlimited') {
                btnUnl.classList.add('active');
                btnPts.classList.remove('active');
            } else {
                btnPts.classList.add('active');
                btnUnl.classList.remove('active');
            }
        }
        
        const confirmBox = document.getElementById('admin-cancel-confirm-box');
        if (confirmBox) confirmBox.style.display = 'none';
    },

    async adminModifyPoints(action, btn) {
        if (!this.adminState.selectedUser) return;
        const input = document.getElementById('admin_pts_input');
        const amount = parseInt(input ? input.value : 0) || 0;
        if (amount <= 0) {
            this.showToast('الرجاء إدخال عدد نقاط صحيح أكبر من صفر', 'error');
            return;
        }

        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch('/api/admin/web/user/update', {
                    method: 'POST',
                    headers: this.getAdminHeaders(),
                    body: JSON.stringify({
                        chatId: this.adminState.selectedUser.chatId,
                        action: action === 'add' ? 'add_points' : 'remove_points',
                        amount: amount
                    })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    this.showToast(data.message, 'success');
                    this.updateUserInState(data.user);
                } else {
                    this.showToast(data.error || 'فشلت العملية', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    async adminSetPaymentSource(source, btn) {
        if (!this.adminState.selectedUser) return;
        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch('/api/admin/web/user/update', {
                    method: 'POST',
                    headers: this.getAdminHeaders(),
                    body: JSON.stringify({
                        chatId: this.adminState.selectedUser.chatId,
                        action: 'set_payment_source',
                        paymentSource: source
                    })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    this.showToast(data.message, 'success');
                    this.updateUserInState(data.user);
                } else {
                    this.showToast(data.error || 'فشلت العملية', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    async adminSetStatus(status, btn) {
        if (!this.adminState.selectedUser) return;
        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch('/api/admin/web/user/update', {
                    method: 'POST',
                    headers: this.getAdminHeaders(),
                    body: JSON.stringify({
                        chatId: this.adminState.selectedUser.chatId,
                        action: 'set_status',
                        status: status
                    })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    this.showToast(data.message, 'success');
                    this.updateUserInState(data.user);
                } else {
                    this.showToast(data.error || 'فشلت العملية', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    async adminRenew(days, btn) {
        if (!this.adminState.selectedUser) return;
        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch('/api/admin/web/user/update', {
                    method: 'POST',
                    headers: this.getAdminHeaders(),
                    body: JSON.stringify({
                        chatId: this.adminState.selectedUser.chatId,
                        action: 'renew',
                        days: days
                    })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    this.showToast(data.message, 'success');
                    this.updateUserInState(data.user);
                } else {
                    this.showToast(data.error || 'فشلت العملية', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    async adminRenewCustom(btn) {
        const input = document.getElementById('admin_renew_custom_days');
        const days = parseInt(input ? input.value : 0) || 0;
        if (days <= 0) {
            this.showToast('الرجاء إدخال عدد أيام صحيح', 'error');
            return;
        }
        await this.adminRenew(days, btn);
    },

    promptCancelSubscription() {
        const box = document.getElementById('admin-cancel-confirm-box');
        if (box) box.style.display = 'block';
    },

    async executeCancelSubscription(btn) {
        if (!this.adminState.selectedUser) return;
        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch('/api/admin/web/user/update', {
                    method: 'POST',
                    headers: this.getAdminHeaders(),
                    body: JSON.stringify({
                        chatId: this.adminState.selectedUser.chatId,
                        action: 'cancel'
                    })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    this.showToast(data.message, 'success');
                    this.updateUserInState(data.user);
                } else {
                    this.showToast(data.error || 'فشلت العملية', 'error');
                }
            } catch (err) {
                this.showToast('خطأ في الاتصال: ' + err.message, 'error');
            }
        });
    },

    updateUserInState(updatedUser) {
        this.adminState.selectedUser = updatedUser;
        const idx = (this.adminState.users || []).findIndex(u => String(u.chatId) === String(updatedUser.chatId));
        if (idx >= 0) {
            this.adminState.users[idx] = updatedUser;
        }
        this.renderManageModalContent(updatedUser);
        this.renderAdminUsers();
        this.loadAdminData();
    },

    async openUserReportsModal(btn) {
        if (!this.adminState.selectedUser) return;
        await this.openDirectUserReports(this.adminState.selectedUser.chatId, btn);
    },

    async openDirectUserReports(chatId, btn) {
        const modal = document.getElementById('admin-reports-modal');
        const body = document.getElementById('admin-reports-modal-body');
        if (modal) modal.style.display = 'flex';
        if (body) body.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">⏳ جاري تحميل التقارير...</div>';

        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch(`/api/admin/web/user/${chatId}/reports`, {
                    headers: this.getAdminHeaders()
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.reports)) {
                    if (data.reports.length === 0) {
                        body.innerHTML = '<div style="text-align:center; padding:25px; color:#94a3b8;">لا توجد تقارير مسجلة لهذا المشترك</div>';
                        return;
                    }
                    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                    for (const r of data.reports) {
                        html += `
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px;">
                            <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.9rem;">
                                <span>${r.patientName || 'مريض'}</span>
                                <span style="font-family:monospace; color:#0d9488;">${r.id || '-'}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#64748b; margin-top:4px;">
                                <span>نوع: ${r.type === 'companion' ? 'مرافقة' : (r.type === 'companion_review' ? 'مشهد مرافق' : 'إجازة مرضية')}</span>
                                <span>التاريخ: ${r.issueDate || '-'}</span>
                            </div>
                        </div>`;
                    }
                    html += '</div>';
                    body.innerHTML = html;
                } else {
                    body.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">${data.error || 'فشل جلب التقارير'}</div>`;
                }
            } catch (err) {
                body.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">خطأ: ${err.message}</div>`;
            }
        });
    },

    async openUserLogsModal(btn) {
        if (!this.adminState.selectedUser) return;
        await this.openDirectUserLogs(this.adminState.selectedUser.chatId, btn);
    },

    async openDirectUserLogs(chatId, btn) {
        const modal = document.getElementById('admin-logs-modal');
        const body = document.getElementById('admin-logs-modal-body');
        if (modal) modal.style.display = 'flex';
        if (body) body.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">⏳ جاري تحميل سجل العمليات...</div>';

        await this.executeAdminBtn(btn, async () => {
            try {
                const res = await fetch(`/api/admin/web/user/${chatId}/logs`, {
                    headers: this.getAdminHeaders()
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.logs)) {
                    if (data.logs.length === 0) {
                        body.innerHTML = '<div style="text-align:center; padding:25px; color:#94a3b8;">لا توجد حركات مسجلة لهذا المشترك</div>';
                        return;
                    }
                    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                    for (const l of data.logs) {
                        const dateStr = l.timestamp ? l.timestamp.replace('T', ' ').split('.')[0] : '-';
                        html += `
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px;">
                            <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.85rem; color:#0f172a;">
                                <span>${l.details || l.operation}</span>
                                <span style="font-size:0.75rem; color:#64748b;">${dateStr}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#64748b; margin-top:4px;">
                                <span>العملية: <code>${l.operation}</code></span>
                                ${l.amount != null ? `<span>الكمية: <b>${l.amount}</b></span>` : ''}
                            </div>
                        </div>`;
                    }
                    html += '</div>';
                    body.innerHTML = html;
                } else {
                    body.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">${data.error || 'فشل جلب السجلات'}</div>`;
                }
            } catch (err) {
                body.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">خطأ: ${err.message}</div>`;
            }
        });
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
        this.exitTrialMode(); // بدء نموذج عادي يلغي وضع التجريبي ويعيد فتح الحقول
        this.state.leaveType = type;
        this.state.currentStep = 1;
        
        let title = 'إصدار تقرير جديد';
        if (type === 'sickleave') title = 'إصدار تقرير إجازة مرضية';
        else if (type === 'companion') title = 'إصدار تقرير مرافقة مريض';
        else if (type === 'companion_review') title = 'إصدار مشهد مراجعة لمرافق';
        document.getElementById('form-title').innerText = title;
        
        const typeSelect = document.getElementById('leave_type');
        typeSelect.innerHTML = '<option value="GSL">GSL</option><option value="PSL">PSL</option>';
        
        const isCompanionType = (type === 'companion' || type === 'companion_review');
        document.getElementById('escort-fields').style.display = isCompanionType ? 'block' : 'none';
        
        // Dynamically move National ID field based on type
        const idGroup = document.getElementById('national-id-group');
        if (idGroup) {
            if (isCompanionType) {
                const datesRow = document.querySelector('#escort-fields .dates-row');
                document.getElementById('escort-fields').insertBefore(idGroup, datesRow);
            } else {
                const step2 = document.getElementById('step-2');
                step2.insertBefore(idGroup, step2.firstChild);
            }
        }
        
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
        
        let randHours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        let randMinutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        document.getElementById('issue_time').value = `${randHours}:${randMinutes}`;
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
            this.showToast('عذراً، بيانات هذا التقرير القديم غير متوفرة للتعديل.', 'error');
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
            this.showToast('يرجى تعبئة الحقول المطلوبة.', 'error');
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
        // كتالوج الباقات: الاسم الظاهر + السعر (يُرسل للمالك برسالة معبأة مسبقاً)
        const catalog = {
            'Points 5': 'حزمة البداية 5 نقاط (5 ريال)',
            'Points 10': 'حزمة 10 نقاط (10 ريال)',
            'Points 20': 'حزمة 20 نقطة (15 ريال)',
            'Points 50': 'حزمة 50 نقطة (30 ريال)',
            'Basic': 'حزمة النقاط الأساسية 30 نقطة (20 ريال)',
            'Recommended': 'حزمة النقاط الموصى بها 100 نقطة (50 ريال)',
            'Advanced': 'حزمة النقاط المتقدمة 200 نقطة (80 ريال)',
            'Month 1': 'خطة 30 يوم لامحدودة (100 ريال)'
        };
        const label = catalog[pkgName] || pkgName;
        const idPart = this.state.chatId ? ` — معرّف حسابي: ${this.state.chatId}` : '';

        // إشعار فوري للمالك عبر البوت: «المستخدم طلب باقة كذا» مع أزرار الشحن السريع
        try {
            const tgUser = (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) || null;
            fetch('/api/packages/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: this.state.chatId,
                    pkgId: pkgName,
                    name: tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : '',
                    username: (tgUser && tgUser.username) || ''
                })
            }).catch(() => {});
        } catch (e) { /* إشعار غير حاجز — لا يمنع فتح المحادثة */ }

        const text = `مرحباً، أود شراء باقة: ${label} لحسابي${idPart}`;
        const url = 'https://t.me/ppppokl?text=' + encodeURIComponent(text);
        if (this.tg) {
            this.tg.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    },

    // ===== نافذة «شحن حسابي» (طلب المالك: نص تعليمات الشحن جاهز بضغطة واحدة) =====
    buildRechargeText() {
        let name = '';
        try {
            const u = (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) || null;
            if (u) name = [u.first_name, u.last_name].filter(Boolean).join(' ');
        } catch (e) {}
        return `💳 لشحن حسابك:\n━━━━━━━━━━━━━━━━━━━━━━\n1. تواصل مع المسؤول:\n   • عبر تيليجرام: @ppppokl\n   • عبر واتساب: +967738473371\n2. أرسل له المعلومات التالية:\n- معرفك: ${this.state.chatId || '—'}\n- الاسم: ${name || '—'}\n- المبلغ المطلوب شحنه\n- التحويل عبر الكريمي:\n--> رقم الحساب السعودي: 3053743187\n- إثبات الدفع (ارسال صورة التحويل للمسؤول)\n━━━━━━━━━━━━━━━━━━━━━━\n3. بعد التأكد من الدفع، سيتم شحن حسابك فوراً.\n━━━━━━━━━━━━━━━━━━━━━━`;
    },

    showRechargeInfo() {
        const box = document.getElementById('recharge-text');
        if (box) box.innerText = this.buildRechargeText();
        const ov = document.getElementById('recharge-overlay');
        if (ov) ov.style.display = 'flex';
        if (this.tg && this.tg.HapticFeedback) {
            try { this.tg.HapticFeedback.impactOccurred('light'); } catch (e) {}
        }
    },

    closeRechargeInfo() {
        const ov = document.getElementById('recharge-overlay');
        if (ov) ov.style.display = 'none';
    },

    async copyRechargeInfo(btn) {
        const text = this.buildRechargeText();
        let ok = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                ok = true;
            }
        } catch (e) {}
        if (!ok) {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                ok = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (e) {}
        }
        if (btn) {
            const old = btn.textContent;
            btn.textContent = ok ? '✅ تم النسخ' : '⚠️ انسخ يدوياً';
            setTimeout(() => { btn.textContent = old; }, 2000);
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
        // وضع التجريبي: بيانات ثابتة معبأة مسبقاً — إصدار مباشر بفحص الرصيد (آلية التجريبي)
        if (this.state.trialMode) {
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                await this.populatePdfAndGenerate(true);
            } catch(e) {
                console.error(e);
                this.showToast("حدث خطأ أثناء إعداد التقرير التجريبي: " + (e.message || e), "error");
                document.getElementById('loading-overlay').style.display = 'none';
            }
            return;
        }

        // Final Validation — نفس آلية الكود المصدري مع مصدر الدفع الذي حددته الإدارة:
        // نقاط → يلزم 5 نقاط لكل تقرير جديد | غير محدود → يغطيها الاشتراك النشط
        if(!this.state.currentReportId) {
            const paySrc = this.state.reportPaymentSource || (this.state.subscriptionDays > 0 ? 'unlimited' : 'points');
            const blocked = (paySrc === 'points')
                ? (this.state.points < 5)
                : (this.state.subscriptionDays <= 0 && this.state.points < 5);
            if (blocked) {
                this.showNoCreditModal();
                return;
            }
        }

        // Show loading
        document.getElementById('loading-overlay').style.display = 'flex';
        
        try {
            await this.populatePdfAndGenerate();
        } catch(e) {
            console.error(e);
            this.showToast("حدث خطأ أثناء إعداد التقرير: " + (e.message || e), "error");
            document.getElementById('loading-overlay').style.display = 'none';
        }
    },

    async populatePdfAndGenerate(isTrial = false) {
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

        const isCompanionType = (type === 'companion' || type === 'companion_review');
        const escAr = isCompanionType ? document.getElementById('escort_name_ar').value : '';
        const escEn = isCompanionType ? document.getElementById('escort_name_en').value : '';
        const relAr = isCompanionType ? document.getElementById('relation_ar').value : '';
        const relEn = isCompanionType ? document.getElementById('relation_en').value : '';

        let titleAr = 'تقرير إجازة مرضية';
        let titleEn = 'Sick Leave Report';
        if (type === 'companion') {
            titleAr = 'تقرير مرافقة مريض';
            titleEn = 'Patient Companion Report';
        } else if (type === 'companion_review') {
            titleAr = 'مشهد مراجعة لمرافق';
            titleEn = 'Companion Attendance Certificate';
        }

        const reportDataPayload = {
            titleAr: titleAr,
            titleEn: titleEn,
            leaveId: reportId,
            durationEn: `${duration} day ( ${gregoAdm} to ${gregoDis} )`,
            durationAr: `${duration} يوم ( <span dir="ltr">${hijriAdm}</span> الى <span dir="ltr">${hijriDis}</span> )`,
            admissionG: gregoAdm,
            admissionH: hijriAdm,
            dischargeG: gregoDis,
            dischargeH: hijriDis,
            issueDate: this.formatGregorian(issueDate),
            nameLabelEn: isCompanionType ? 'Companion Name' : 'Name',
            nameLabelAr: isCompanionType ? 'اسم المرافق' : 'الاسم',
            nameEn: isCompanionType ? escEn.toUpperCase() : pNameEn.toUpperCase(),
            nameAr: isCompanionType ? escAr : pNameAr,
            nationalId: idNum,
            nationalityEn: nationalityEn,
            nationalityAr: nationalityAr,
            relationEn: isCompanionType ? relEn : '',
            relationAr: isCompanionType ? relAr : '',
            employerEn: "",
            employerAr: employer || 'غير محدد',
            docLabelEn: isCompanionType ? 'Physician Name' : 'Practitioner Name',
            docLabelAr: isCompanionType ? 'اسم الطبيب المعالج' : 'اسم الممارس',
            doctorEn: docNameEn.toUpperCase(),
            doctorAr: docNameAr,
            positionEn: jobEn,
            positionAr: jobAr,
            hospitalAr: hospAr,
            hospitalEn: hospEn,
            hospitalLogoBase64: this.state.hospitalLogoUrl || null,
            licenseNumber: isPrivate ? license : '',
            time: this.formatAMPM(issueTime),
            dayDate: this.formatDateLabel(issueDate),
            type: type,
            patient_name_ar: pNameAr,
            patient_name_en: pNameEn,
            escort_name_ar: escAr,
            escort_name_en: escEn,
            relation_ar: relAr,
            relation_en: relEn
        };

        try {
            // NOTE: points are deducted SERVER-SIDE (authoritative). The server returns the
            // new balance in the response and we sync the UI with it after success.

            // SERVER-SIDE GENERATION
            const res = await fetch('/api/generate-native-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: app.state.chatId,
                    reportData: reportDataPayload,
                    filename: 'sickLeaves.pdf',
                    reportId: reportId,
                    trial: isTrial
                })
            });
            
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'فشل توليد التقرير');
            }

            // Trial consumed server-side — sync so the button disables immediately
            if (data.trialUsed) {
                this.state.trialUsed = true;
                this.state.trialMode = false;
            }
            if (isTrial) this.exitTrialMode(); // إنهاء وضع التجريبي بعد التنزيل

            // Sync balance from the server's authoritative value (after any deduction)
            if (data.points != null) {
                app.state.points = data.points;
            }
            if (data.subscriptionDays != null) {
                app.state.subscriptionDays = data.subscriptionDays;
            }
            if (data.paySource) {
                app.state.reportPaymentSource = data.paySource;
            }
            app.updateDashboardUI();

            // إشعار الرصيد داخل التطبيق بعد كل إصدار رسمي (كم تبقى له نقاط)
            const balanceBox = document.getElementById('post-issue-balance');
            if (balanceBox) {
                if (isTrial) {
                    balanceBox.style.display = 'none';
                } else if (data.paySource === 'points') {
                    balanceBox.innerHTML = `🧾 خُصمت 5 نقاط لإصدار التقرير<br><b style="font-size:19px;color:#112233;">🌑 رصيدك المتبقي: ${data.points != null ? data.points : 0} نقطة</b>`;
                    balanceBox.style.display = 'block';
                } else {
                    balanceBox.innerHTML = `♾️ اشتراك غير محدود<br><b style="font-size:19px;color:#112233;">📅 الأيام المتبقية: ${data.subscriptionDays != null ? data.subscriptionDays : 0} يوم</b>`;
                    balanceBox.style.display = 'block';
                }
            }

            // Also save report data (trials are NEVER persisted — non-official samples)
            if (!isTrial) {
                await fetch(`/api/report/${app.state.chatId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        report: {
                            id: reportId,
                            patientName: isCompanionType ? escAr : pNameAr,
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
            }

            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('report-form').reset();
            app.navigate('success');

        } catch(e) {
            console.error("PDF Generation error: ", e);
            fetch('/api/logs?msg=' + encodeURIComponent('Client_Error: ' + e.message));
            this.showToast("حدث خطأ أثناء إصدار التقرير: " + e.message, "error");
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

