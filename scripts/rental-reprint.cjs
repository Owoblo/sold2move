const fs = require('fs');
const path = require('path');
const { renderRental, validateManifest } = require('./rental-artwork.cjs');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
async function run() {
  const output = 'rental-reprint-output';
  if (!process.argv.includes('--email-only')) {
    const all = walk('rental-reprint-source');
    const pointers = all.filter(f => path.basename(f) === 'current-postcard-output.txt');
    const selected = pointers.map(f => {
      const folder = fs.readFileSync(f, 'utf8').trim();
      if (!['postcards','postcards-supplement'].includes(folder)) throw new Error('Invalid rental output pointer');
      return path.join(path.dirname(f), folder, 'rental-batch.json');
    });
    const files = selected.length ? selected : all.filter(f => path.basename(f) === 'rental-batch.json');
    if (files.length !== 1) throw new Error(`Expected one saved rental batch, found ${files.length}`);
    await renderRental(JSON.parse(fs.readFileSync(files[0])), output);
  } else {
    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'rental-batch.json')));
    validateManifest(manifest);
    const { sendEmail } = require('./postcard-email-results.cjs');
    await sendEmail('business@starmovers.ca', `REPLACEMENT rental artwork — ${manifest.recipients.length} existing recipients`,
      '<p>Replacement artwork for the same saved rental batch. This is not an additional print order. Recipient addresses are unchanged.</p>',
      walk(output).map(file => ({ filename: path.basename(file), content: fs.readFileSync(file).toString('base64') })));
  }
}
if (require.main === module) run().catch(e => { console.error(e.message); process.exitCode = 1; });
