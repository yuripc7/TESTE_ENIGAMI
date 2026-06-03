import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const htmlPath = path.join(process.cwd(), 'Agenda da Semana (standalone) (2).html');
const outputDir = path.join(process.cwd(), 'scratch', 'unpacked_v2');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Reading HTML file...');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract Manifest
const manifestMatch = htmlContent.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!manifestMatch) {
  console.error('Could not find manifest in HTML file.');
  process.exit(1);
}

// Extract Template
const templateMatch = htmlContent.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
if (!templateMatch) {
  console.error('Could not find template in HTML file.');
  process.exit(1);
}

const manifest = JSON.parse(manifestMatch[1].trim());
let template = JSON.parse(templateMatch[1].trim());

console.log(`Found manifest with ${Object.keys(manifest).length} entries.`);

const mimeExtensionMap = {
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'application/json': 'json'
};

const resourceMap = {};

for (const [uuid, entry] of Object.entries(manifest)) {
  console.log(`Unpacking asset ${uuid} (${entry.mime}, compressed: ${entry.compressed})...`);
  
  const buffer = Buffer.from(entry.data, 'base64');
  let unpackedBuffer = buffer;

  if (entry.compressed) {
    try {
      unpackedBuffer = zlib.gunzipSync(buffer);
    } catch (err) {
      console.error(`Failed to decompress asset ${uuid}:`, err.message);
    }
  }

  const ext = mimeExtensionMap[entry.mime] || 'bin';
  const filename = `${uuid}.${ext}`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, unpackedBuffer);
  console.log(`Saved: ${filename}`);

  resourceMap[uuid] = filename;
}

fs.writeFileSync(path.join(outputDir, 'template.html'), template);
console.log('Saved template.html');

fs.writeFileSync(path.join(outputDir, 'mapping.json'), JSON.stringify(resourceMap, null, 2));
console.log('Saved mapping.json');

console.log('Unpacking completed successfully! Output in scratch/unpacked_v2/');
