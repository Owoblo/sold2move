#!/usr/bin/env node
// Owner-only inventory/change report. Never calls print submission or includes
// the sample envelope proof as though it were a qualified production batch.
const fs = require('node:fs');
const path = require('node:path');
const Papa = require('papaparse');
const { sendEmail } = require('./postcard-email-results.cjs');
const { GTA_RECIPIENT } = require('./gta-delivery-policy.cjs');
async function main() {
  const dir = path.join(__dirname, '.gta-census');
  const summary = JSON.parse(fs.readFileSync(path.join(dir, 'collection-summary.json'), 'utf8'));
  const changes = JSON.parse(fs.readFileSync(path.join(dir, 'changes.json'), 'utf8'));
  const csv = rows => Papa.unparse({
    fields: ['zpid', 'street', 'municipality', 'postal_code', 'price', 'listing_url', 'qualification'],
    data: rows.map(r => ({
    zpid: r.zpid, street: r.street, municipality: r.municipality,
    postal_code: r.postal_code, price: r.price, listing_url: r.detail_url,
    qualification: 'candidate_only_not_ready_for_mailing',
  })) }, { escapeFormulae: true });
  const attachment = (filename, value) => ({ filename, content: Buffer.from(value).toString('base64') });
  const attachments = [
    attachment('GTA_Inventory_Summary.json', JSON.stringify(summary, null, 2)),
    attachment('GTA_Newly_Observed_Candidates.csv', csv(changes.new_candidates)),
    attachment('GTA_Sale_Or_Delisting_Candidates.csv', csv(changes.sold_or_delisted_candidates)),
    attachment('GTA_Municipality_Coverage.csv', fs.readFileSync(path.join(dir, 'municipality-quality.csv'))),
  ];
  const html = `<h2>Toronto / GTA inventory and changes</h2>
    <p><strong>Inventory observed:</strong> ${summary.observed}</p>
    <p><strong>Newly observed candidates:</strong> ${changes.new_candidates.length}</p>
    <p><strong>Sale/delisting candidates:</strong> ${changes.sold_or_delisted_candidates.length}</p>
    <p><strong>Qualified envelopes attached: 0.</strong> These are inventory comparison reports;
    candidate properties have not yet completed mailing qualification. Missing listings are not confirmed sales.</p>
    <p>GTA delivery goes only to business@starmovers.ca. No print-shop submission occurred.</p>`;
  const result = await sendEmail(GTA_RECIPIENT, 'GTA inventory report — candidate lists, no qualified envelopes',
    html, attachments, 'toronto', `gta-inventory-${summary.run_id}`);
  fs.writeFileSync(path.join(dir, 'owner-report-receipt.json'), JSON.stringify({
    run_id: summary.run_id, recipient: GTA_RECIPIENT, provider_id: result.id,
    print_shop_submission: false, qualified_envelopes: 0,
  }, null, 2));
  console.log(`GTA inventory/change report delivered to ${GTA_RECIPIENT}; no printer delivery`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
