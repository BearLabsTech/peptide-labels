// Decodes a `data:image/png;base64,...` URL (captured via browser automation,
// since automated downloads can't be retrieved reliably) into a PNG file.
// Used to (re)generate docs/reference-exports/40x20-rounded.png — see the
// README in that folder for the full capture procedure.
//
// Usage: node scripts/decode-png-dataurl.cjs <data-url-input-file> <output.png>
const fs = require('fs');
const inFile = process.argv[2];
const outFile = process.argv[3];
const text = fs.readFileSync(inFile, 'utf8').trim();
const match = text.match(/^data:image\/png;base64,(.*)$/);
if (!match) {
  console.error('Not a PNG data URL');
  process.exit(1);
}
const bytes = Buffer.from(match[1], 'base64');
fs.writeFileSync(outFile, bytes);
console.log('wrote', outFile, bytes.length, 'bytes');
