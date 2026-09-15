const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// I will completely replace the body of populatePdfAndGenerate() to remove all redundant client-side PDF DOM manipulation.
// This is the cleanest and safest way to ensure no DOM-related loops or QRCode bugs occur.

const newMethod = `    async populatePdfAndGenerate() {
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
        const natMap = {"أفغاني":"Afghan","ألباني":"Albanian","جزائري":"Algerian","أمريكي":"American","أندوري":"Andorran","أنغولي":"Angolan","أرجنتيني":"Argentine","أرميني":"Armenian","أسترالي":"Australian","نمساوي":"Austrian","أذربيجاني":"Azerbaijani","بهامي":"Bahamian","بحريني":"Bahraini","بنجلاديشي":"Bangladeshi","بربادوسي":"Barbadian","بيلاروسي":"Belarusian","بلجيكي":"Belgian","بليزي":"Belizean","بنيني":"Beninese","بوتاني":"Bhutanese","بوليفي":"Bolivian","بوسني":"Bosnian","برازيلي":"Brazilian","بريطاني":"British","بروني":"Bruneian","بلغاري":"Bulgarian","بوركيني":"Burkinabe","بوروندي":"Burundian","كمبودي":"Cambodian","كاميروني":"Cameroonian","كندي":"Canadian","الرأس الأخضر":"Cape Verdean","أفريقي أوسطي":"Central African","تشادي":"Chadian","تشيلي":"Chilean","صيني":"Chinese","كولومبي":"Colombian","قمري":"Comoran","كونغولي":"Congolese","كوستاريكي":"Costa Rican","كرواتي":"Croatian","كوبي":"Cuban","قبرصي":"Cypriot","تشيكي":"Czech","دنماركي":"Danish","جيبوتي":"Djiboutian","دومينيكاني":"Dominican","هولندي":"Dutch","تيموري شرقي":"East Timorese","إكوادوري":"Ecuadorean","مصري":"Egyptian","سلفادوري":"Salvadoran","غيني استوائي":"Equatorial Guinean","إريتري":"Eritrean","إستوني":"Estonian","إثيوبي":"Ethiopian","فيجي":"Fijian","فنلندي":"Finnish","فرنسي":"French","غابوني":"Gabonese","غامبي":"Gambian","جورجي":"Georgian","ألماني":"German","غاني":"Ghanaian","يوناني":"Greek","غرينادي":"Grenadian","غواتيمالي":"Guatemalan","غيني":"Guinean","غيني بيساوي":"Guinea-Bissauan","غوياني":"Guyanese","هايتي":"Haitian","هندوراسي":"Honduran","مجري":"Hungarian","أيسلندي":"Icelandic","هندي":"Indian","إندونيسي":"Indonesian","إيراني":"Iranian","عراقي":"Iraqi","أيرلندي":"Irish","إسرائيلي":"Israeli","إيطالي":"Italian","إيفواري":"Ivorian","جامايكي":"Jamaican","ياباني":"Japanese","أردني":"Jordanian","كازاخستاني":"Kazakhstani","كيني":"Kenyan","كيريباتي":"I-Kiribati","كوري شمالي":"North Korean","كوري جنوبي":"South Korean","كويتي":"Kuwaiti","قرغيزي":"Kyrgyz","لاوسي":"Laotian","لاتفي":"Latvian","لبناني":"Lebanese","ليسوثي":"Mosotho","ليبيري":"Liberian","ليبي":"Libyan","ليختنشتايني":"Liechtensteiner","ليتواني":"Lithuanian","لوكسمبورغي":"Luxembourger","مقدوني":"Macedonian","ملغاشي":"Malagasy","ملاوي":"Malawian","ماليزي":"Malaysian","ملديفي":"Maldivian","مالي":"Malian","مالطي":"Maltese","موريتاني":"Mauritanian","موريشيوسي":"Mauritian","مكسيكي":"Mexican","ميكرونيزي":"Micronesian","مولدوفي":"Moldovan","موناكي":"Monegasque","منغولي":"Mongolian","مونتينيغري":"Montenegrin","مغربي":"Moroccan","موزمبيقي":"Mozambican","ناميبي":"Namibian","ناوروي":"Nauruan","نيبالي":"Nepalese","نيوزيلندي":"New Zealander","نيكاراغوي":"Nicaraguan","نيجري":"Nigerien","نيجيري":"Nigerian","عماني":"Omani","باكستاني":"Pakistani","بالاوي":"Palauan","فلسطيني":"Palestinian","بنمي":"Panamanian","بابوا غينيا الجديدة":"Papua New Guinean","باراغواياني":"Paraguayan","بيروفي":"Peruvian","فلبيني":"Philippine","بولندي":"Polish","برتغالي":"Portuguese","قطري":"Qatari","روماني":"Romanian","روسي":"Russian","رواندي":"Rwandan","لوسياني":"Saint Lucian","ساموي":"Samoan","السعودية / سعودي":"Saudi Arabia","سنغالي":"Senegalese","صربي":"Serbian","سيشلي":"Seychellois","سيراليوني":"Sierra Leonean","سنغافوري":"Singaporean","سلوفاكي":"Slovak","سلوفيني":"Slovenian","صومالي":"Somali","جنوب أفريقي":"South African","إسباني":"Spanish","سريلانكي":"Sri Lankan","سوداني":"Sudanese","سورينامي":"Surinamer","سوازيلاندي":"Swazi","سويدي":"Swedish","سويسري":"Swiss","سوري":"Syrian","تايواني":"Taiwanese","طاجيكي":"Tajik","تنزاني":"Tanzanian","تايلاندي":"Thai","توغولي":"Togolese","تونسي":"Tunisian","تركي":"Turkish","تركمانستاني":"Turkmen","أوغندي":"Ugandan","أوكراني":"Ukrainian","إماراتي":"Emirati","أوروغواياني":"Uruguayan","أوزبكستاني":"Uzbekistani","فنزويلي":"Venezuelan","فيتنامي":"Vietnamese","يمني":"Yemeni","زامبي":"Zambian","زيمبابوي":"Zimbabwean"};
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

        const reportId = \`GSL\${Math.floor(Math.random() * 10000000000)}\`;

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
            durationEn: \`\${duration} day ( \${gregoAdm} to \${gregoDis} )\`,
            durationAr: \`\${duration} يوم ( \${hijriAdm} إلى \${hijriDis} )\`,
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
            employerEn: employer,
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
            app.state.points -= 5;
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
            await fetch(\`/api/report/\${app.state.chatId}\`, {
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
    },`;

appJs = appJs.replace(/    async populatePdfAndGenerate\(\) \{[\s\S]*?\}\,(\s*closeApp\(\) \{)/, newMethod + '\n$1');

fs.writeFileSync('app.js', appJs, 'utf8');

// Also increment version to v40
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/app\.js\?v=\d+/g, 'app.js?v=40');
fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Fixed app.js logic to remove redundant code!');
