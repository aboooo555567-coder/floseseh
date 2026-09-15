const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg [^>]*style="position:absolute;top:15px;right:0px;[^>]*>.*?<\/svg>/s;
const regex2 = /<svg [^>]*style="position:absolute;top:20px;right:0px;[^>]*>.*?<\/svg>/s;

const exactSvg = `<svg width="280" height="150" viewBox="0 0 320 170" style="position:absolute;top:15px;right:0px;opacity:0.8;">
    <path d="M 30,40 L 55,60 M 30,40 L 65,50 M 55,60 L 65,50 M 55,60 L 70,100 M 65,50 L 70,100 M 70,100 L 85,35 M 70,100 L 105,70 M 70,100 L 100,110 M 85,35 L 105,70 M 85,35 L 150,30 M 105,70 L 100,110 M 105,70 L 150,30 M 105,70 L 195,60 M 105,70 L 170,80 M 150,30 L 195,60 M 150,30 L 190,40 M 100,110 L 170,80 M 170,80 L 195,60 M 170,80 L 240,90 M 190,40 L 195,60 M 190,40 L 240,90 M 195,60 L 240,90 M 240,90 L 250,40 M 240,90 L 255,85 M 240,90 L 280,130 M 250,40 L 255,85 M 255,85 L 290,30 M 280,130 L 290,30 M 280,130 L 300,160 M 290,30 L 300,160" stroke="#9cb1cd" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
    <circle cx="30" cy="40" r="2.5" fill="#9cb1cd"/>
    <circle cx="55" cy="60" r="2.5" fill="#9cb1cd"/>
    <circle cx="65" cy="50" r="2.5" fill="#9cb1cd"/>
    <circle cx="70" cy="100" r="2.5" fill="#9cb1cd"/>
    <circle cx="85" cy="35" r="2.5" fill="#9cb1cd"/>
    <circle cx="105" cy="70" r="2.5" fill="#9cb1cd"/>
    <circle cx="100" cy="110" r="2.5" fill="#9cb1cd"/>
    <circle cx="150" cy="30" r="2.5" fill="#9cb1cd"/>
    <circle cx="170" cy="80" r="2.5" fill="#9cb1cd"/>
    <circle cx="190" cy="40" r="2.5" fill="#9cb1cd"/>
    <circle cx="195" cy="60" r="2.5" fill="#9cb1cd"/>
    <circle cx="240" cy="90" r="2.5" fill="#9cb1cd"/>
    <circle cx="250" cy="40" r="2.5" fill="#9cb1cd"/>
    <circle cx="255" cy="85" r="2.5" fill="#9cb1cd"/>
    <circle cx="280" cy="130" r="2.5" fill="#9cb1cd"/>
    <circle cx="290" cy="30" r="2.5" fill="#9cb1cd"/>
    <circle cx="300" cy="160" r="2.5" fill="#9cb1cd"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh rebuilt with exact node dots and structure.");
} else if (regex2.test(serverJs)) {
    serverJs = serverJs.replace(regex2, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh rebuilt with exact node dots and structure (regex2).");
} else {
    // Brute force replacement
    const generalRegex = /<svg[^>]*>.*?<\/svg>/s;
    serverJs = serverJs.replace(generalRegex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh rebuilt (general regex).");
}
