// layout_engine.js
// Applies strict coordinate system to pdf-template.html based on LAYOUT configuration

function applyLayout() {
    if (!window.LAYOUT) {
        console.error("LAYOUT configuration not found!");
        return;
    }

    const C = window.LAYOUT;

    // Helper to apply styles
    const setPos = (id, config) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.position = 'absolute';
        if (config.x !== undefined) el.style.left = config.x + 'mm';
        if (config.cx !== undefined) {
            // center based on width if provided, otherwise assume 50% transform
            if (config.width !== undefined) {
                el.style.left = (config.cx - (config.width / 2)) + 'mm';
            } else {
                el.style.left = config.cx + 'mm';
                el.style.transform = 'translateX(-50%)';
            }
        }
        if (config.y !== undefined) el.style.top = config.y + 'mm';
        if (config.width !== undefined) el.style.width = config.width + 'mm';
        if (config.height !== undefined) el.style.height = config.height + 'mm';
        if (config.fontSize !== undefined) el.style.fontSize = config.fontSize + 'pt';
        if (config.objectFit !== undefined) el.style.objectFit = config.objectFit;
        
        // Debug
        if (C.DEBUG_LAYOUT) {
            el.style.outline = '1px solid red';
            el.style.backgroundColor = 'rgba(255,0,0,0.05)';
        }
    };

    // Main Container
    const container = document.getElementById('pdf-content');
    if (container) {
        container.style.width = C.PAGE.width + 'mm';
        container.style.height = C.PAGE.height + 'mm';
        container.style.padding = '0';
        container.style.position = 'relative';
        container.style.boxSizing = 'border-box';
        
        if (C.DEBUG_LAYOUT) {
            // Add center line
            const centerLine = document.createElement('div');
            centerLine.style.position = 'absolute';
            centerLine.style.left = '105mm';
            centerLine.style.top = '0';
            centerLine.style.bottom = '0';
            centerLine.style.width = '1px';
            centerLine.style.backgroundColor = 'blue';
            centerLine.style.zIndex = '9999';
            container.appendChild(centerLine);
        }
    }

    // Header
    setPos('pdf-seha-logo', C.HEADER.SEHA_LOGO);
    setPos('pdf-mesh-graphic', C.HEADER.MESH_GRAPHIC);
    setPos('pdf-calligraphy', C.HEADER.CALLIGRAPHY);
    setPos('pdf-kingdom-text', C.HEADER.KINGDOM_TEXT);
    setPos('pdf-title-ar', C.HEADER.TITLE_AR);
    setPos('pdf-title-en', C.HEADER.TITLE_EN);

    // Table Container
    setPos('pdf-table', C.TABLE);
    const table = document.getElementById('pdf-table');
    if (table) {
        table.style.tableLayout = 'fixed';
        
        // Set column widths via generic css
        const style = document.createElement('style');
        style.innerHTML = `
            #pdf-table { font-size: ${C.TABLE.FONT_SIZE}pt; }
            #pdf-table td { 
                border: 1px solid ${C.TABLE.BORDER_COLOR}; 
                height: ${C.TABLE.ROW_HEIGHT}mm;
                box-sizing: border-box;
                padding: 0;
                overflow: hidden;
                white-space: nowrap;
            }
            #pdf-table tr { height: ${C.TABLE.ROW_HEIGHT}mm; }
            .pdf-en-label { width: ${C.TABLE.COL_1}mm; color: ${C.TABLE.LABEL_COLOR}; font-weight: bold; }
            .pdf-value { color: #333; }
            .pdf-ar-label { width: ${C.TABLE.COL_4}mm; color: ${C.TABLE.LABEL_COLOR}; font-weight: bold; }
            
            /* For the 3-column rows (colspan=2 in middle) */
            #pdf-leave-id, #pdf-issue-date, #pdf-national-id { width: ${C.TABLE.COL_2 + C.TABLE.COL_3}mm; }
            
            /* Duration row */
            .pdf-duration-row { background-color: ${C.TABLE.DURATION_BG}; color: ${C.TABLE.DURATION_COLOR}; }
            .pdf-duration-label-en, .pdf-duration-val, .pdf-duration-label-ar {
                background-color: ${C.TABLE.DURATION_BG} !important;
                color: ${C.TABLE.DURATION_COLOR} !important;
                font-weight: bold;
                border: 1px solid ${C.TABLE.BORDER_COLOR} !important;
            }
        `;
        document.head.appendChild(style);
        
        // Hardcode width for the middle cells when they aren't colspanned
        const setColWidths = () => {
            const trs = table.querySelectorAll('tr');
            trs.forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length === 4) {
                    tds[1].style.width = C.TABLE.COL_2 + 'mm';
                    tds[2].style.width = C.TABLE.COL_3 + 'mm';
                }
            });
        };
        setColWidths();
    }

    // Footer
    setPos('pdf-qrcode', C.FOOTER.QR_CODE);
    setPos('pdf-verify-ar-1', C.FOOTER.VERIFY_TEXT_AR_1);
    setPos('pdf-verify-ar-2', C.FOOTER.VERIFY_TEXT_AR_2);
    setPos('pdf-verify-en', C.FOOTER.VERIFY_TEXT_EN);
    setPos('pdf-verify-link', C.FOOTER.VERIFY_LINK);
    setPos('pdf-time', C.FOOTER.TIME_TEXT);
    setPos('pdf-day-date', C.FOOTER.DATE_TEXT);
    setPos('pdf-divider', C.FOOTER.DIVIDER);
    setPos('pdf-moh-logo', C.FOOTER.MOH_LOGO);
    setPos('pdf-hospital-logo', C.FOOTER.HOSPITAL_LOGO);
    setPos('pdf-hospital-ar', C.FOOTER.HOSPITAL_AR);
    setPos('pdf-hospital-en', C.FOOTER.HOSPITAL_EN);
    setPos('pdf-license', C.FOOTER.LICENSE);
    setPos('pdf-nhic-logo', C.FOOTER.NHIC_LOGO);
    
    // Fix center alignments for elements using cx but no explicit width
    ['pdf-kingdom-text', 'pdf-title-ar', 'pdf-title-en', 'pdf-verify-ar-1', 'pdf-verify-ar-2', 'pdf-verify-en', 'pdf-verify-link', 'pdf-hospital-ar', 'pdf-hospital-en', 'pdf-license'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.textAlign = 'center';
            // We set width to 100% and left to 0, then just let text-align: center do the work if we want it centered on the page.
            // But if they have cx and width, we used that. If they only have cx, we used left: cx, transform.
            // Wait, transform might mess up html2canvas.
            // A safer way is to set width: 100%, left: 0, and text-align: center. 
            // OR set a fixed width and left = cx - width/2.
            // Let's set a wide fixed width for text elements and position them using left.
        }
    });
}

// Apply layout when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all elements are parsed
    setTimeout(applyLayout, 100);
});

// Also expose it globally in case app.js wants to re-apply it after injecting data
window.applyLayout = applyLayout;
