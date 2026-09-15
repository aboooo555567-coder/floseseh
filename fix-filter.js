const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const newFilter = `
    filterCustomSelect() {
        if(!this.currentDropdown) return;
        const query = document.getElementById('custom-select-input').value;
        const queryLower = query.toLowerCase();
        let filtered = this.dropdownData[this.currentDropdown].filter(item => item.toLowerCase().includes(queryLower));
        
        // Allow manual custom entry
        if (query.trim() !== '' && !filtered.includes(query.trim())) {
            filtered.unshift(query.trim());
        }
        
        this.renderDropdownList(filtered);
    },
`;

appJs = appJs.replace(/filterCustomSelect\(\)\s*\{[\s\S]*?\},/, newFilter);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed app.js custom dropdown logic');
