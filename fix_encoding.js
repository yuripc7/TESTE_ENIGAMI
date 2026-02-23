// Fix double-encoded UTF-8 in App.tsx
// PowerShell's Set-Content read the file as Latin-1 and wrote it as UTF-8,
// causing all multi-byte UTF-8 sequences to be double-encoded.
const fs = require('fs');

const filePath = './App.tsx';

// Read the file as raw bytes
const buf = fs.readFileSync(filePath);

// Remove BOM if present
let start = 0;
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    start = 3;
}

// The file is currently double-encoded UTF-8:
// Original UTF-8 bytes were interpreted as Latin-1 then re-encoded to UTF-8
// To fix: decode as UTF-8 to get the "Latin-1" string, then interpret those
// code points as raw bytes and decode as UTF-8 again.

const content = buf.slice(start).toString('utf8');

// Convert each character back to its byte value if it's in the Latin-1 range
// This reverses the double-encoding
let bytes = [];
for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code < 256) {
        bytes.push(code);
    } else {
        // For characters outside Latin-1, encode as UTF-8
        const encoded = Buffer.from(content[i], 'utf8');
        for (const b of encoded) {
            bytes.push(b);
        }
    }
}

const fixed = Buffer.from(bytes).toString('utf8');

// Write back without BOM
fs.writeFileSync(filePath, fixed, 'utf8');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
const hasPadrao = verify.includes('padrão');
const hasCronometro = verify.includes('CRONÔMETRO');
const hasAcao = verify.includes('AÇÃO');
const hasAlteracoes = verify.includes('alterações');

console.log('Fix applied!');
console.log('padrão found:', hasPadrao);
console.log('CRONÔMETRO found:', hasCronometro);
console.log('AÇÃO found:', hasAcao);
console.log('alterações found:', hasAlteracoes);
