const fs = require('fs');
let inquiryHtml = fs.readFileSync('inquiry.html', 'utf8');

const oldInput = '<input type="number" id="national_id" placeholder="أدخل رقم الهوية">';
const newInput = '<input type="number" id="national_id" placeholder="1xxxxxxxxx" style="text-align: left; direction: ltr;">';

if (inquiryHtml.includes(oldInput)) {
    inquiryHtml = inquiryHtml.replace(oldInput, newInput);
    fs.writeFileSync('inquiry.html', inquiryHtml, 'utf8');
    console.log("Updated National ID placeholder and alignment in inquiry.html");
} else {
    console.log("Could not find oldInput in inquiry.html");
}
