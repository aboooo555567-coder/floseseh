const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

js = js.replace(
\window.scrollTo(0, 0);

            // Generate PNG using html-to-image\,
\window.scrollTo(0, 0);

            // Temporarily move pdf-container into viewport
            const pdfContainer = document.getElementById('pdf-container');
            const origTop = pdfContainer.style.top;
            const origLeft = pdfContainer.style.left;
            const origZIndex = pdfContainer.style.zIndex;
            
            pdfContainer.style.top = '0';
            pdfContainer.style.left = '0';
            pdfContainer.style.zIndex = '1000';

            // Generate PNG using html-to-image\
);

js = js.replace(
\            } catch (fallbackErr) {\,
\            } catch (fallbackErr) {\
);

js = js.replace(
\// Restore page states
            document.body.style.overflow = originalOverflow;\,
\// Restore page states
            pdfContainer.style.top = origTop;
            pdfContainer.style.left = origLeft;
            pdfContainer.style.zIndex = origZIndex;
            document.body.style.overflow = originalOverflow;\
);

fs.writeFileSync('app.js', js, 'utf8');
console.log('Fixed');
