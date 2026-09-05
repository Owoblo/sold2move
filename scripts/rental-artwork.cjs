// Pure saved-batch rendering: no database, scraping, AI, or mailing-state updates.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Papa = require('papaparse');
const { generatePremiumEnvelopes } = require('./generate-premium-envelopes.cjs');
const { REGION_CONFIG } = require('./postcard-region-config.cjs');
function digest(rows) { return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'); }
function validateManifest(manifest) {
  if (manifest.campaign !== 'rental-current-occupant-v1' || !manifest.batch_id || !Array.isArray(manifest.recipients)) throw new Error('Invalid rental batch manifest');
  if (digest(manifest.recipients) !== manifest.recipient_sha256) throw new Error('Rental recipient manifest changed; reprint refused');
  const seen = new Set();
  for (const row of manifest.recipients) {
    if (!REGION_CONFIG[row.region] || !row.addressstreet || !row.city || !row.addresszipcode || !row.mailing_key || seen.has(row.mailing_key)) throw new Error('Incomplete or duplicate rental recipient');
    seen.add(row.mailing_key);
  }
}
async function renderRental(manifest, outputDir) {
  validateManifest(manifest);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'rental-batch.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outputDir, 'rental-recipients.csv'), Papa.unparse(manifest.recipients, { newline: '\n' }));
  const outputs = [];
  for (const region of [...new Set(manifest.recipients.map(r => r.region))]) {
    const rows = manifest.recipients.filter(r => r.region === region);
    const outputPath = path.join(outputDir, `Rental_${region}_${manifest.batch_id}.pdf`);
    await generatePremiumEnvelopes({ records: rows, recipientName: 'The Residents',
      logoPath: path.join(__dirname, 'assets/brand-svg/SaturnStarMovers_Wordmark_DeepNavy_NoDescriptor.png'),
      brandTreatment: 'lockup', addressTreatment: 'editorial', editorialSide: 'right',
      includeBack: false, includeFrontReturn: true, usePaperStock: true, region, outputPath });
    const { PDFDocument } = require('pdf-lib');
    const pdf = await PDFDocument.load(fs.readFileSync(outputPath));
    if (pdf.getPageCount() !== rows.length) throw new Error('Rental PDF page count differs from saved recipients');
    outputs.push(outputPath);
  }
  return outputs;
}
if (require.main === module) {
  const [source, output = 'rental-reprint-output'] = process.argv.slice(2);
  Promise.resolve().then(() => renderRental(JSON.parse(fs.readFileSync(source)), output)).catch(e => { console.error(e.message); process.exitCode = 1; });
}
module.exports = { digest, validateManifest, renderRental };
