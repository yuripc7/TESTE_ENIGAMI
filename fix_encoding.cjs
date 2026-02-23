// Fix double-encoded UTF-8 in App.tsx  
// Save as .cjs to force CommonJS
const fs = require('fs');

const filePath = './App.tsx';

// Read raw bytes
const buf = fs.readFileSync(filePath);

// Remove BOM if present (EF BB BF)
let start = 0;
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    start = 3;
    console.log('BOM detected, removing...');
}

const content = buf.slice(start).toString('utf8');

// Reverse double-encoding: treat each char as a byte value
const bytes = [];
for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code < 256) {
        bytes.push(code);
    } else {
        const encoded = Buffer.from(content[i], 'utf8');
        for (const b of encoded) bytes.push(b);
    }
}

const fixed = Buffer.from(bytes).toString('utf8');

// Also normalize line endings to LF
const normalizedFixed = fixed.replace(/\r\n/g, '\n');

fs.writeFileSync(filePath, normalizedFixed, 'utf8');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
console.log('Fix applied!');
console.log('padrão:', verify.includes('padrão'));
console.log('CRONÔMETRO:', verify.includes('CRONÔMETRO'));
console.log('AÇÃO:', verify.includes('AÇÃO'));
console.log('alterações:', verify.includes('alterações'));
console.log('façam:', verify.includes('faça'));
console.log('Total lines:', verify.split('\n').length);
