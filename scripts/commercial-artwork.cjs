// Pure saved-batch rendering: no database, scraping, AI, or mailing-state updates.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Papa = require('papaparse');
const { generatePremiumEnvelopes } = require('./generate-premium-envelopes.cjs');
const { REGION_CONFIG } = require('./postcard-region-config.cjs');
function digest(rows) { return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'); }
function validateManifest(manifest) {
  if (manifest.campaign !== 'commercial-outgoing-business-v1' || !manifest.batch_id || !Array.isArray(manifest.recipients)) throw new Error('Invalid commercial batch manifest');
  if (digest(manifest.recipients) !== manifest.recipient_sha256) throw new Error('Commercial recipient manifest changed; reprint refused');
  const seen = new Set();
  for (const row of manifest.recipients) {
    if (!REGION_CONFIG[row.region] || !row.addressstreet || !row.city || !row.addresszipcode || !row.mailing_key || seen.has(row.mailing_key)) throw new Error('Incomplete or duplicate commercial recipient');
    seen.add(row.mailing_key);
  }
}
async function renderCommercial(manifest, outputDir) {
  validateManifest(manifest);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const name of fs.readdirSync(outputDir)) if (/^Commercial_.*\.pdf$/.test(name)) fs.unlinkSync(path.join(outputDir, name));
  fs.writeFileSync(path.join(outputDir, 'commercial-batch.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outputDir, 'commercial-recipients.csv'), Papa.unparse(manifest.recipients, { newline: '\n' }));
  const outputs = [];
  for (const region of [...new Set(manifest.recipients.map(r => r.region))]) {
    const rows = manifest.recipients.filter(r => r.region === region);
    const outputPath = path.join(outputDir, `Commercial_${region}_${manifest.batch_id}.pdf`);
    await generatePremiumEnvelopes({ records: rows, recipientName: 'The Business Owner',
      logoPath: path.join(__dirname, 'assets/brand-svg/SaturnStarMovers_Wordmark_DeepNavy_NoDescriptor.png'),
      brandTreatment: 'lockup', addressTreatment: 'editorial', editorialSide: 'right',
      includeBack: false, includeFrontReturn: true, usePaperStock: true, region, outputPath });
    const { PDFDocument } = require('pdf-lib');
    const pdf = await PDFDocument.load(fs.readFileSync(outputPath));
    if (pdf.getPageCount() !== rows.length) throw new Error('Commercial PDF page count differs from saved recipients');
    outputs.push(outputPath);
  }
  return outputs;
}
if (require.main === module) {
  const [source, output = 'commercial-reprint-output'] = process.argv.slice(2);
  Promise.resolve().then(() => renderCommercial(JSON.parse(fs.readFileSync(source)), output)).catch(e => { console.error(e.message); process.exitCode = 1; });
}
module.exports = { digest, validateManifest, renderCommercial };
