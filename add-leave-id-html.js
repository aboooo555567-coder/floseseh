const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

const search = `                        <select id="leave_type" required style="border-color: var(--primary); border-radius: 12px; padding: 16px; font-weight: bold; font-size: 16px;">
                            <option value="GSL">GSL</option>
                            <option value="PSL">PSL</option>
                        </select>
                    </div>`;

const replace = `                        <select id="leave_type" required style="border-color: var(--primary); border-radius: 12px; padding: 16px; font-weight: bold; font-size: 16px;">
                            <option value="GSL">GSL</option>
                            <option value="PSL">PSL</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>رمز الإجازة (اختياري - يولد تلقائياً)</label>
                        <input type="text" id="manual_leave_id" placeholder="مثال: GSL26082746525">
                    </div>`;

if (indexHtml.includes(search)) {
    indexHtml = indexHtml.replace(search, replace);
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log("Added manual_leave_id to index.html");
} else {
    console.log("String not found in index.html");
}
