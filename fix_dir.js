const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

js = js.replace(
\// Very important for RTL pages: html2canvas calculates X incorrectly if the page is RTL.
const originalHtmlDir = document.documentElement.getAttribute('dir');
const originalBodyDir = document.body.getAttribute('dir');
document.documentElement.setAttribute('dir', 'ltr');
document.body.setAttribute('dir', 'ltr');\,
\// Very important for RTL pages: html2canvas calculates X incorrectly if the page is RTL.
// We will ONLY apply this if html-to-image fails, because html-to-image needs native RTL for dates.
const originalHtmlDir = document.documentElement.getAttribute('dir');
const originalBodyDir = document.body.getAttribute('dir');\
);

js = js.replace(
\                    if (window.ArabicReshaper) {\,
\                    document.documentElement.setAttribute('dir', 'ltr');
                    document.body.setAttribute('dir', 'ltr');
                    if (window.ArabicReshaper) {\
);

fs.writeFileSync('app.js', js, 'utf8');
console.log('Fixed dir logic');
