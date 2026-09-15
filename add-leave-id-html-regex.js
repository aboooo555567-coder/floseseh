const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

const regex = /<div class="dates-row">/g;
const replace = `<div class="form-group">
                        <label>رمز الإجازة (اختياري - يولد تلقائياً)</label>
                        <input type="text" id="manual_leave_id" placeholder="مثال: GSL26082746525">
                    </div>
                    
                    <div class="dates-row">`;

if (regex.test(indexHtml)) {
    indexHtml = indexHtml.replace('<div class="dates-row">', replace);
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log("Added manual_leave_id using regex.");
} else {
    console.log("Still not found!");
}
