const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');
let indexHtml = fs.readFileSync('index.html', 'utf8');

const replacements = {
    'سعودي': 'السعودية',
    'يمني': 'اليمن',
    'مصري': 'مصر',
    'سوري': 'سوريا',
    'أردني': 'الأردن',
    'لبناني': 'لبنان',
    'سوداني': 'السودان',
    'هندي': 'الهند',
    'باكستاني': 'باكستان',
    'بنجلاديشي': 'بنجلاديش',
    'فلبيني': 'الفلبين',
    'إندونيسي': 'إندونيسيا',
    'أفغاني': 'أفغانستان',
    'فلسطيني': 'فلسطين',
    'عراقي': 'العراق',
    'مغربي': 'المغرب',
    'جزائري': 'الجزائر',
    'تونسي': 'تونس',
    'ليبي': 'ليبيا',
    'كويتي': 'الكويت',
    'بحريني': 'البحرين',
    'قطري': 'قطر',
    'عماني': 'عمان',
    'إماراتي': 'الإمارات',
    'صومالي': 'الصومال',
    'تركي': 'تركيا',
    'إيراني': 'إيران',
    'بريطاني': 'بريطانيا',
    'أمريكي': 'الولايات المتحدة',
    'كندي': 'كندا',
    'أسترالي': 'أستراليا',
    'سريلانكي': 'سريلانكا',
    'نيبالي': 'نيبال',
    'إريتري': 'إريتريا',
    'إثيوبي': 'إثيوبيا',
    'كيني': 'كينيا',
    'أوغندي': 'أوغندا'
};

for (const [oldVal, newVal] of Object.entries(replacements)) {
    // Replace exact string in array: "سعودي" -> "السعودية"
    appJs = appJs.split(`"${oldVal}"`).join(`"${newVal}"`);
    // Replace exact key in natMap: "سعودي": -> "السعودية":
    appJs = appJs.split(`"${oldVal}":`).join(`"${newVal}":`);
    
    // In indexHtml, update default value if any
    indexHtml = indexHtml.split(`value="${oldVal}"`).join(`value="${newVal}"`);
}

fs.writeFileSync('app.js', appJs, 'utf8');
fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Updated nationalities to country names');
