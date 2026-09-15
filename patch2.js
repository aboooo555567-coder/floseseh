const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes('} finally {\n        dbMutex.unlock();\n    }\n});\n\n// Secure Admin Endpoint to Add Packages')) {
    code = code.replace(
        /res\.json\(\{ success: true, report, generatedAt: new Date\(\)\.toISOString\(\) \}\);\r?\n\s+\} catch \(err\) \{\r?\n\s+res\.status\(500\)\.json\(\{ success: false, error: err\.message \}\);\r?\n\s+\}\r?\n\}\);/,
        `res.json({ success: true, report, generatedAt: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        dbMutex.unlock();
    }
});`
    );
    fs.writeFileSync('server.js', code);
    console.log('Patched finally block!');
} else {
    console.log('Already patched!');
}
