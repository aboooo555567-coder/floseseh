const fs = require('fs');

const points = {
  P1: [20, 30],
  P2: [60, 0],
  P3: [70, 60],
  P4: [100, 0],
  P5: [120, 40],
  P6: [130, 100],
  P7: [160, 0],
  P8: [170, 50],
  P9: [200, 0],
  P10: [200, 80],
  P11: [230, 30],
  P12: [240, 80],
  P13: [250, 0]
};

const edges = [
  ['P1','P2'], ['P1','P3'], ['P2','P3'],
  ['P2','P4'], ['P3','P4'], ['P3','P5'], ['P4','P5'],
  ['P3','P6'], ['P5','P6'],
  ['P4','P7'], ['P5','P7'], ['P5','P8'], ['P7','P8'],
  ['P6','P8'], ['P7','P9'], ['P8','P9'], ['P8','P10'], ['P9','P10'],
  ['P9','P11'], ['P10','P11'], ['P11','P13'], ['P10','P12'], ['P11','P12'], ['P12','P13']
];

let path = '';
for (const [u, v] of edges) {
  path += `M ${points[u][0]},${points[u][1]} L ${points[v][0]},${points[v][1]} `;
}

let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="250" height="150" viewBox="0 0 200 120"[^>]*>.*?<\/svg>/s;
const newSvg = `<svg width="260" height="120" viewBox="0 0 250 120" style="position:absolute;top:0px;right:0px;opacity:0.7;">
    <path d="${path.trim()}" stroke="#216ba5" stroke-width="0.7" fill="none"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, newSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG updated perfectly.");
} else {
    console.log("Regex didn't match.");
}
