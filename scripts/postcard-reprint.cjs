#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { REGION_CONFIG } = require('./postcard-region-config.cjs');
const { generatePDF } = require('./postcard-step5-output.cjs');
const { sendPostcardCorrection } = require('./postcard-email-results.cjs');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
async function main() {
  const region = process.env.REPRINT_REGION;
  if (!REGION_CONFIG[region]) throw new Error('Invalid reprint region');
  const files = walk(process.env.REPRINT_SOURCE_DIR || 'reprint-source');
  const candidates = files.filter(file => path.basename(file).startsWith(`${REGION_CONFIG[region].outputPrefix}_Postcards_`) && file.endsWith('.csv'));
  if (candidates.length !== 1) throw new Error(`Expected exactly one source CSV; found ${candidates.length}`);
  const { data, errors } = Papa.parse(fs.readFileSync(candidates[0], 'utf8'), { header: true, skipEmptyLines: true });
  if (errors.length || !data.length) throw new Error('Invalid or empty source CSV');
  const output = path.resolve('reprint-output');
  fs.mkdirSync(output, { recursive: true });
  const csvPath = path.join(output, path.basename(candidates[0]));
  const pdfPath = path.join(output, path.basename(candidates[0], '.csv') + '_Corrected_Brand.pdf');
  fs.copyFileSync(candidates[0], csvPath);
  await generatePDF(data, pdfPath, { region });
  const { PDFDocument } = require('pdf-lib');
  const pdf = await PDFDocument.load(fs.readFileSync(pdfPath));
  if (pdf.getPageCount() !== data.length) throw new Error('Generated PDF page count differs from recipient count');
  if (process.env.REPRINT_SEND_EMAIL === 'true') await sendPostcardCorrection(region, csvPath, pdfPath);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
