const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const targetStr = `const pdfElement = document.getElementById('pdf-content');
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


const replacementStr = `const pdfElement = document.getElementById('pdf-content');
// Ensure the element is completely visible before rendering
pdfElement.parentElement.style.opacity = '1';
pdfElement.parentElement.style.zIndex = '9999';
pdfElement.parentElement.style.position = 'absolute'; // Use absolute to prevent fixed viewport issues
pdfElement.parentElement.style.top = '0';
pdfElement.parentElement.style.left = '0';
pdfElement.parentElement.style.right = 'auto';

// Very important for RTL pages: html2canvas calculates X incorrectly if the page is RTL.
const originalHtmlDir = document.documentElement.getAttribute('dir');
const originalBodyDir = document.body.getAttribute('dir');
document.documentElement.setAttribute('dir', 'ltr');
document.body.setAttribute('dir', 'ltr');

// Prevent body overflow clipping
const originalOverflow = document.body.style.overflow;
const originalDocOverflow = document.documentElement.style.overflow;
document.body.style.overflow = 'visible';
document.documentElement.style.overflow = 'visible';

// Scroll to top-left to ensure capture area is within viewport coordinates
window.scrollTo(0, 0);

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
                    x: 0,
                    y: 0,
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

// Restore page states
document.body.style.overflow = originalOverflow;
document.documentElement.style.overflow = originalDocOverflow;
if(originalHtmlDir) document.documentElement.setAttribute('dir', originalHtmlDir);
else document.documentElement.removeAttribute('dir');
if(originalBodyDir) document.body.setAttribute('dir', originalBodyDir);
else document.body.removeAttribute('dir');`;

if (appJs.includes(targetStr)) {
    appJs = appJs.replace(targetStr, replacementStr);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log('app.js updated successfully!');
} else {
    console.log('Target string not found in app.js!');
}
