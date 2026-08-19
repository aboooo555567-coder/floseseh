const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const targetStr = `const pdfElement = document.getElementById('pdf-content');
// Ensure the element is completely visible before rendering
pdfElement.parentElement.style.opacity = '1';
pdfElement.parentElement.style.zIndex = '9999';
pdfElement.parentElement.style.top = '0';
pdfElement.parentElement.style.left = '0';

            
            // html2canvas gets confused if the element is inside a wrapper that has scaling or weird RTL offsets
            // So we explicitly force the dimensions and bypass viewport limits
            const opt = {
                margin: 0,
                filename: 'sickLeaves.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    windowWidth: 794, 
                    width: 794, 
                    windowHeight: 1123, 
                    height: 1123, 
                    scrollY: 0, 
                    scrollX: 0 
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBase64 = await html2pdf().from(pdfElement).set(opt).outputPdf('datauristring');
// Hide it again
pdfElement.parentElement.style.opacity = '0.01';
pdfElement.parentElement.style.zIndex = '-9999';
pdfElement.parentElement.style.top = '-10000px';
pdfElement.parentElement.style.left = '-10000px';`;

const replacementStr = `const pdfElement = document.getElementById('pdf-content');
// Ensure the element is completely visible before rendering
pdfElement.parentElement.style.opacity = '1';
pdfElement.parentElement.style.zIndex = '9999';
pdfElement.parentElement.style.position = 'fixed';
pdfElement.parentElement.style.top = '0';
pdfElement.parentElement.style.left = '0';
pdfElement.parentElement.style.right = 'auto';
document.body.style.overflow = 'visible';
document.documentElement.style.overflow = 'visible';

            const opt = {
                margin: 0,
                filename: 'sickLeaves.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    windowWidth: 794, 
                    width: 794, 
                    windowHeight: 1122, 
                    height: 1122, 
                    scrollY: 0, 
                    scrollX: 0,
                    allowTaint: true,
                    letterRendering: true
                },
                jsPDF: { unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] }
            };

            const pdfBase64 = await html2pdf().from(pdfElement).set(opt).outputPdf('datauristring');

// Hide it again
pdfElement.parentElement.style.opacity = '0.01';
pdfElement.parentElement.style.zIndex = '-9999';
pdfElement.parentElement.style.position = 'absolute';
pdfElement.parentElement.style.top = '-10000px';
pdfElement.parentElement.style.left = '-10000px';
document.body.style.overflow = '';
document.documentElement.style.overflow = '';`;

if (appJs.includes(targetStr)) {
    appJs = appJs.replace(targetStr, replacementStr);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log('app.js updated successfully!');
} else {
    console.log('Target string not found in app.js!');
    // Try to find it loosely
    const idx = appJs.indexOf("const pdfElement = document.getElementById('pdf-content');");
    if(idx !== -1) {
        console.log("Found start, let's replace by regex or slicing.");
        const endIdx = appJs.indexOf("pdfElement.parentElement.style.left = '-10000px';", idx);
        if(endIdx !== -1) {
            const endFull = endIdx + "pdfElement.parentElement.style.left = '-10000px';".length;
            const looseReplace = appJs.substring(0, idx) + replacementStr + appJs.substring(endFull);
            fs.writeFileSync('app.js', looseReplace, 'utf8');
            console.log('app.js updated successfully via loose matching!');
        }
    }
}
