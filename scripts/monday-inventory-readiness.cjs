#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { PDFDocument } = require('pdf-lib');
const { getSupabase, getRegionConfig } = require('./postcard-lib.cjs');
const { fetchExistingRegionListings } = require('./postcard-step0-scrape.cjs');
const { assessCoverage } = require('./gta-collection.cjs');
const { compareInventories } = require('./gta-inventory-diff.cjs');
const { generatePDF } = require('./postcard-step5-output.cjs');
async function main() {
  const out = path.join(__dirname, '..', 'reports', 'monday-readiness');
  fs.mkdirSync(out, { recursive: true });
  // Use the same database role as the actual regional scraper for this check.
  const started = Date.now();
  const ottawa = await fetchExistingRegionListings(getSupabase(), getRegionConfig('ottawa'));
  const report = { checked_at: new Date().toISOString(), ottawa: { rows: ottawa.length,
    read_seconds: Math.round((Date.now() - started) / 1000),
    statuses: ottawa.reduce((counts, row) => { counts[row.status] = (counts[row.status] || 0) + 1; return counts; }, {}) } };
  const storage = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }).storage.from('gta-inventory');
  const downloaded = await storage.download('latest.json');
  if (downloaded.error) throw downloaded.error;
  const snapshot = JSON.parse(await downloaded.data.text());
  const rows = snapshot.inventory.filter(r => r.last_seen_at === snapshot.collected_at).map(r => r.data);
  const coverage = assessCoverage(snapshot, rows);
  const diff = compareInventories(rows, rows);
  if (!coverage.passed || diff.new_candidates.length || diff.sold_or_delisted_candidates.length) {
    throw new Error('Saved GTA baseline failed coverage or repeat-snapshot validation');
  }
  const output = path.join(out, 'Toronto_GTA_Envelope_Front_Only.pdf');
  await generatePDF([{ addressstreet: '123 Example Street', city: 'Toronto', addressstate: 'ON', addresszipcode: 'M5V 2T6' }], output, { region: 'toronto' });
  const pdf = await PDFDocument.load(fs.readFileSync(output));
  if (pdf.getPageCount() !== 1) throw new Error('GTA proof must contain one front page');
  report.gta = { observed_at: snapshot.collected_at, count: rows.length,
    municipality_count: Object.keys(coverage.current_counts).length, coverage,
    repeat_snapshot_new: diff.new_candidates.length, repeat_snapshot_missing: diff.sold_or_delisted_candidates.length,
    return_address: getRegionConfig('toronto').returnAddressLines, envelope_pages: pdf.getPageCount(),
    envelope_size: pdf.getPage(0).getSize(), printing: 'held_pending_qualification' };
  fs.writeFileSync(path.join(out, 'readiness.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
