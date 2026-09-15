const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes('class Mutex {')) {
    code = code.replace(
        'const adminState = {};',
        `class Mutex {\n    constructor() {\n        this.queue = [];\n        this.locked = false;\n    }\n    async lock() {\n        return new Promise(resolve => {\n            this.queue.push(resolve);\n            this.dispatch();\n        });\n    }\n    unlock() {\n        this.locked = false;\n        this.dispatch();\n    }\n    dispatch() {\n        if (this.locked || this.queue.length === 0) return;\n        this.locked = true;\n        const next = this.queue.shift();\n        next();\n    }\n}\nconst dbMutex = new Mutex();\n\nconst adminState = {};`
    );
    fs.writeFileSync('server.js', code);
    console.log('Mutex added!');
} else {
    console.log('Mutex already exists!');
}
