const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Wrap the table and footer in an absolute container
serverJs = serverJs.replace(
    /<table style="position:absolute;top:185px;left:40px;width:714px;/g,
    '<div style="position:absolute;top:185px;left:40px;width:714px;">\n  <table style="width:100%;'
);

// 2. The footer currently has padding: 0 40px; which we don't need if the wrapper handles width.
// Wait, the wrapper is 714px wide (same as table). So we can use 100% width and remove padding.
serverJs = serverJs.replace(
    /margin-top:40px; padding: 0 40px; height:200px;/g,
    'margin-top:40px; height:200px;'
);

// 3. Add closing </div> for the wrapper right before </body>
// The structure is currently:
//   </div> (closing footer)
// </div> (closing main page container)
// </body>
// We need to add one more </div> before the main page closing container.
serverJs = serverJs.replace(
    /    <\/div>\n  <\/div>\n\n<\/div>\n<\/body>/g,
    '    </div>\n  </div>\n\n  </div>\n</div>\n</body>'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed absolute positioning overlap for footer');
