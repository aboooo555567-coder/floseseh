const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const targetCode = `            // Create jsPDF and inject the perfectly rendered image
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] });
            pdf.addImage(dataUrl, 'JPEG', 0, 0, 794, 1122);
            const pdfBase64 = pdf.output('datauristring');`;

const replaceCode = `            // Create jsPDF and inject the perfectly rendered image
            const jsPDFClass = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
            if (!jsPDFClass) throw new Error("jsPDF not loaded");
            const pdf = new jsPDFClass({ unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] });
            pdf.addImage(dataUrl, 'JPEG', 0, 0, 794, 1122);
            const pdfBase64 = pdf.output('datauristring');`;

appJs = appJs.replace(targetCode, replaceCode);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed jsPDF instantiation in app.js');
