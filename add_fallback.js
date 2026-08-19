const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const targetCode = `
            // Generate PNG using dom-to-image to preserve exact browser Arabic text rendering (RTL/CTL)
            // html2canvas is known to mangle Arabic cursive joining.
            const scale = 2; // high quality
            const dataUrl = await domtoimage.toJpeg(pdfElement, {
                quality: 0.98,
                bgcolor: '#ffffff',
                width: 794 * scale,
                height: 1122 * scale,
                style: {
                    transform: 'scale(' + scale + ')',
                    transformOrigin: 'top left',
                    width: '794px',
                    height: '1122px'
                }
            });

            // Create jsPDF and inject the perfectly rendered image
            const jsPDFClass = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
            if (!jsPDFClass) throw new Error("jsPDF not loaded");
            const pdf = new jsPDFClass({ unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] });
            pdf.addImage(dataUrl, 'JPEG', 0, 0, 794, 1122);
            const pdfBase64 = pdf.output('datauristring');
`;

const replaceCode = `
            // Generate PNG using dom-to-image to preserve exact browser Arabic text rendering (RTL/CTL)
            // html2canvas is known to mangle Arabic cursive joining.
            let pdfBase64;
            try {
                const scale = 2; // high quality
                const dataUrl = await domtoimage.toJpeg(pdfElement, {
                    quality: 0.98,
                    bgcolor: '#ffffff',
                    width: 794 * scale,
                    height: 1122 * scale,
                    style: {
                        transform: 'scale(' + scale + ')',
                        transformOrigin: 'top left',
                        width: '794px',
                        height: '1122px'
                    }
                });

                // Create jsPDF and inject the perfectly rendered image
                const jsPDFClass = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
                if (!jsPDFClass) throw new Error("jsPDF not loaded");
                const pdf = new jsPDFClass({ unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] });
                pdf.addImage(dataUrl, 'JPEG', 0, 0, 794, 1122);
                pdfBase64 = pdf.output('datauristring');
            } catch (fallbackErr) {
                console.error("dom-to-image failed, trying html2pdf:", fallbackErr);
                const opt = {
                    margin: 0,
                    filename: 'sickLeaves.pdf',
                    image: { type: 'jpeg', quality: 1 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: false },
                    jsPDF: { unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] }
                };
                pdfBase64 = await html2pdf().from(pdfElement).set(opt).outputPdf('datauristring');
            }
`;

if (appJs.includes('const dataUrl = await domtoimage.toJpeg')) {
    appJs = appJs.replace(targetCode, replaceCode);
    fs.writeFileSync('app.js', appJs, 'utf8');
    console.log('Added fallback to app.js');
}
