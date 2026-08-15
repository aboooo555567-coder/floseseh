$app = Get-Content app.js -Raw

$targetApp = @"
        try {
            const canvasPromise = html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Canvas timeout')), 15000));
            const canvas = await Promise.race([canvasPromise, timeoutPromise]);
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'px', [794, 1123]);
            
            pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
            const pdfBase64Uri = pdf.output('datauristring');
"@

$replacementApp = @"
        try {
            const opt = {
                margin:       0,
                filename:     'sickLeaves.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, windowWidth: 794, width: 794, x: 0, y: 0, scrollX: 0, scrollY: 0 },
                jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' }
            };

            const pdfPromise = html2pdf().set(opt).from(element).toPdf().get('pdf').then(pdf => pdf.output('datauristring'));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Canvas timeout')), 15000));
            const pdfBase64Uri = await Promise.race([pdfPromise, timeoutPromise]);
"@

$app = $app.Replace($targetApp, $replacementApp)
Set-Content app.js $app

$index = Get-Content index.html -Raw
$targetIndex1 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>'
$targetIndex2 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>'
$targetIndex3 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>'
$replacementIndex = '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>' + "`r`n    " + $targetIndex3

$index = $index.Replace($targetIndex1 + "`r`n    " + $targetIndex2 + "`r`n    " + $targetIndex3, $replacementIndex)
$index = $index.Replace('v=9', 'v=10')
Set-Content index.html $index

