// layout_config.js
// Single source of truth for the A4 PDF Coordinate System

const LAYOUT = {
    DEBUG_LAYOUT: false, // Set to true to see grid and bounding boxes
    
    PAGE: {
        width: 210,  // mm
        height: 297, // mm
        unit: 'mm',
    },

    // Header Region
    HEADER: {
        SEHA_LOGO: {
            x: 9, y: 15, width: 45, height: 18, objectFit: 'contain'
        },
        MESH_GRAPHIC: {
            x: 155, y: 5, width: 50, height: 35, objectFit: 'contain'
        },
        CALLIGRAPHY: {
            cx: 105, y: 13, width: 65, height: 20, objectFit: 'contain'
        },
        KINGDOM_TEXT: {
            cx: 105, y: 35, fontSize: 13
        },
        TITLE_AR: {
            cx: 105, y: 44, fontSize: 20
        },
        TITLE_EN: {
            cx: 105, y: 53, fontSize: 15
        }
    },

    // Table Region
    TABLE: {
        y: 65,
        width: 191.5,
        cx: 105, // Center it based on page width
        
        // Exact row heights
        ROW_HEIGHT: 12, // standard row height in mm
        
        // Column widths in percentages or mm. We will use fixed mm.
        // Total = 191.5
        COL_1: 36.5, // English Label
        COL_2: 59.25, // English Value
        COL_3: 59.25, // Arabic Value
        COL_4: 36.5, // Arabic Label
        
        FONT_SIZE: 11,
        HEADER_FONT_SIZE: 11,
        BORDER_COLOR: '#dee2e6',
        LABEL_COLOR: '#216ba5',
        DURATION_BG: '#2b4b7c',
        DURATION_COLOR: '#ffffff'
    },

    // Footer Region
    FOOTER: {
        y: 185, // starting Y for the bottom region
        
        // Left Side
        QR_CODE: {
            x: 25, y: 185, width: 35, height: 35, objectFit: 'contain'
        },
        VERIFY_TEXT_AR_1: {
            x: 10, y: 225, width: 65, fontSize: 8
        },
        VERIFY_TEXT_AR_2: {
            x: 10, y: 229, width: 65, fontSize: 8
        },
        VERIFY_TEXT_EN: {
            x: 10, y: 235, width: 65, fontSize: 7
        },
        VERIFY_LINK: {
            x: 10, y: 240, width: 65, fontSize: 7
        },
        TIME_TEXT: {
            x: 10, y: 255, fontSize: 9
        },
        DATE_TEXT: {
            x: 10, y: 260, fontSize: 9
        },

        // Divider
        DIVIDER: {
            cx: 105, y: 185, width: 0.3, height: 85
        },

        // Right Side
        MOH_LOGO: {
            cx: 160, y: 185, width: 45, height: 25, objectFit: 'contain'
        },
        HOSPITAL_LOGO: {
            cx: 160, y: 212, width: 50, height: 35, objectFit: 'contain'
        },
        HOSPITAL_AR: {
            cx: 160, y: 250, fontSize: 11, width: 60
        },
        HOSPITAL_EN: {
            cx: 160, y: 255, fontSize: 9, width: 60
        },
        LICENSE: {
            cx: 160, y: 262, fontSize: 8
        },
        NHIC_LOGO: {
            cx: 160, y: 268, width: 40, height: 18, objectFit: 'contain'
        }
    }
};

if (typeof window !== 'undefined') {
    window.LAYOUT = LAYOUT;
}
