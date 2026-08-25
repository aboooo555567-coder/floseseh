const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');
const func = \
    async fetchAsBase64(url) {
        if (!url || url.startsWith('data:')) return url;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Failed to fetch image as base64:', e);
            return url;
        }
    },
\;
js = js.replace('async generatePDF(type, reportId) {', func + '\n    async generatePDF(type, reportId) {');
fs.writeFileSync('app.js', js, 'utf8');
console.log('Added fetchAsBase64');
