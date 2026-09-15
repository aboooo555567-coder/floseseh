const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const replacements = {
    '"سعودي"': '"السعودية"',
    '"يمني"': '"اليمن"',
    '"مصري"': '"مصر"',
    '"سوري"': '"سوريا"',
    '"أردني"': '"الأردن"',
    '"لبناني"': '"لبنان"',
    '"سوداني"': '"السودان"',
    '"هندي"': '"الهند"',
    '"باكستاني"': '"باكستان"',
    '"بنجلاديشي"': '"بنجلاديش"',
    '"فلبيني"': '"الفلبين"',
    '"إندونيسي"': '"إندونيسيا"',
    '"أفغاني"': '"أفغانستان"',
    '"فلسطيني"': '"فلسطين"',
    '"عراقي"': '"العراق"',
    '"مغربي"': '"المغرب"',
    '"جزائري"': '"الجزائر"',
    '"تونسي"': '"تونس"',
    '"ليبي"': '"ليبيا"',
    '"كويتي"': '"الكويت"',
    '"بحريني"': '"البحرين"',
    '"قطري"': '"قطر"',
    '"عماني"': '"عمان"',
    '"إماراتي"': '"الإمارات"',
    '"صومالي"': '"الصومال"',
    '"تركي"': '"تركيا"',
    '"إيراني"': '"إيران"'
};

for (const [oldVal, newVal] of Object.entries(replacements)) {
    // Replace in array
    appJs = appJs.replace(oldVal, newVal);
    // Replace in natMap keys
    appJs = appJs.replace(`"${oldVal.replace(/"/g, '')}":`, `"${newVal.replace(/"/g, '')}":`);
}

// Ensure the English mappings also reflect these if needed
// Actually in natMap, we just need to make sure the NEW arabic name maps to the correct English name
// Wait, the original natMap already had mappings for "سعودي": "Saudi Arabian", etc.
// If I changed the key from "سعودي" to "السعودية", the English map should still work.
// But wait! Did I replace the key correctly?
// `appJs = appJs.replace(oldVal, newVal);` only replaces the FIRST occurrence.
// Let's use split/join for all occurrences.
