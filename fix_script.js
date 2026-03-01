const fs = require('fs');
const filePath = 'App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Fix emojis
const regexPrompt = /        1\. .*?RESUMO GERAL.*?\r?\n        2\. .*?PONTOS DE ATEN.*?\r?\n        3\. .*?PR.*?XIMOS PASSOS.*?\r?\n/g;
const replacementPrompt = `        1. 📊 RESUMO GERAL (Saúde do projeto e progresso)\n        2. 🚨 PONTOS DE ATENÇÃO (Atrasos e riscos baseados nos dados)\n        3. 🚀 PRÓXIMOS PASSOS (Sugestões práticas para a equipe)\n`;

// Fix preventDefault
const regexHandle = /const handleSendMessage = async \(\) => {\r?\n        if \(!chatQuery\.trim\(\)\) return;/g;
const replacementHandle = `const handleSendMessage = async (e?: React.FormEvent) => {\n        e?.preventDefault();\n        if (!chatQuery.trim()) return;`;

content = content.replace(regexPrompt, replacementPrompt);
content = content.replace(regexHandle, replacementHandle);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
