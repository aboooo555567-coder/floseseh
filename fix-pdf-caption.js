const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// The caption might be garbled in utf8 reading if it was saved weirdly, 
// but we can use a regex that matches the caption line inside sendDocument.
// It looks like: caption: '...',

const regex = /caption:\s*'[^']+'/g;

// Let's make sure we only replace the caption inside the sendDocument calls.
// Actually, I can just replace all captions that have 'تم إصدار' garbled text.
// Or just find the sendDocument block.

serverJs = serverJs.replace(/caption:\s*'[^']+'/g, (match) => {
    // If it's the success message caption (which has the ✅ and 📎), replace it.
    // If it's something else, keep it. But there are no other sendDocument calls.
    return "caption: '📄 تقرير الإجازة المرضية الخاص بك'";
});

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated caption for sendDocument.");
