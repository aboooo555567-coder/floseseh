const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

const target = \// Scroll to top-left to ensure capture area is within viewport coordinates
window.scrollTo(0, 0);


            // Generate PNG using html-to-image to preserve exact browser Arabic text rendering (RTL/CTL)
            // html2canvas is known to mangle Arabic cursive joining.
            let pdfBase64;\;

const replacement = \// Scroll to top-left to ensure capture area is within viewport coordinates
window.scrollTo(0, 0);

            // Temporarily move pdf-container into viewport (hidden behind loading-overlay)
            const pdfContainer = document.getElementById('pdf-container');
            const origTop = pdfContainer.style.top;
            const origLeft = pdfContainer.style.left;
            const origZIndex = pdfContainer.style.zIndex;
            
            pdfContainer.style.top = '0';
            pdfContainer.style.left = '0';
            pdfContainer.style.zIndex = '1000';

            // Generate PNG using html-to-image to preserve exact browser Arabic text rendering (RTL/CTL)
            let pdfBase64;\;

js = js.replace(target, replacement);

const target2 = \            } catch (fallbackErr) {\;
const replacement2 = \            } catch (fallbackErr) {
                // Restore pdf-container position
                pdfContainer.style.top = origTop;
                pdfContainer.style.left = origLeft;
                pdfContainer.style.zIndex = origZIndex;\;

js = js.replace(target2, replacement2);

const target3 = \                document.body.style.overflow = originalOverflow;
                document.documentElement.style.overflow = originalDocOverflow;\;

const replacement3 = \                document.body.style.overflow = originalOverflow;
                document.documentElement.style.overflow = originalDocOverflow;
                pdfContainer.style.top = origTop;
                pdfContainer.style.left = origLeft;
                pdfContainer.style.zIndex = origZIndex;\;

js = js.replace(target3, replacement3);

fs.writeFileSync('app.js', js, 'utf8');
console.log('Fixed viewport');
