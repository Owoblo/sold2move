#!/usr/bin/env node

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { parseArgs, generatePremiumEnvelopes } = require('./generate-premium-envelopes.cjs');

const ROOT = path.resolve(__dirname, '..');
const CSV = path.join(__dirname, 'fixtures', 'premium-envelope-proof.csv');
const OUTPUT = path.join(ROOT, 'Premium_Envelope_Location_Return_Address_Proofs.pdf');
const PRINT_TEST_OUTPUT = path.join(ROOT, 'Premium_Envelope_Paper_Stock_Print_Test_5_Locations.pdf');
const regions = ['windsor', 'chatham', 'london', 'woodstock', 'wkg'];

async function main() {
  const generated = [];
  for (const region of regions) {
    const outputPath = path.join('/private/tmp', `premium-envelope-${region}-return-proof.pdf`);
    const options = parseArgs([
      CSV,
      '--status', 'sold',
      '--name', 'The Residents',
      '--brand', 'lockup',
      '--address', 'editorial',
      '--editorial-side', 'right',
      '--region', region,
      '--paper-stock',
      '--front-return',
      '--output', outputPath,
    ]);
    await generatePremiumEnvelopes(options);
    generated.push(outputPath);
  }

  const combined = await PDFDocument.create();
  for (const file of generated) {
    const source = await PDFDocument.load(fs.readFileSync(file));
    const pages = await combined.copyPages(source, source.getPageIndices());
    pages.forEach(page => combined.addPage(page));
  }
  const bytes = await combined.save();
  fs.writeFileSync(OUTPUT, bytes);
  fs.writeFileSync(PRINT_TEST_OUTPUT, bytes);
  console.log(`Location proof pack: ${OUTPUT}`);
  console.log(`Paper-stock print test: ${PRINT_TEST_OUTPUT}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
