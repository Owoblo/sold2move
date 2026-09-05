const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { query } = require('./market-db.cjs');
const { buildRentalQueue } = require('./rental-outreach-lib.cjs');
const { digest, renderRental } = require('./rental-artwork.cjs');
const quote = v => `'${String(v).replaceAll("'", "''")}'`;
async function build(runDir, { db = query, render = renderRental } = {}) {
  const batchId = `rental-${path.basename(runDir)}`;
  const prior = await db(`SELECT manifest FROM rental_postcard_batches WHERE batch_id=${quote(batchId)}`);
  if (prior.length) { await render(prior[0].manifest, path.join(runDir, 'postcards')); return prior[0].manifest; }
  const records = JSON.parse(fs.readFileSync(path.join(runDir, 'normalized-source-records.json')));
  const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json')));
  // If mailing history cannot be read, this throws before a batch is generated.
  const history = await db("SELECT mailing_key FROM rental_postcard_recipients WHERE created_at > now() - interval '180 days'");
  const queue = buildRentalQueue(records, lifecycle.events, history);
  fs.writeFileSync(path.join(runDir, 'rental-review-queue.json'), JSON.stringify(queue, null, 2));
  fs.writeFileSync(path.join(runDir, 'rental-review-queue.csv'), Papa.unparse(queue.map(r => ({
    address: r.mailing_street, city: r.city, region: r.acquisition_scope,
    unit: r.unit_label, event: r.event_type, current_occupancy: r.current_occupancy,
    offered_furnishing: r.occupancy_state, confidence: r.classification_confidence,
    score: r.movement_score, eligible: r.postcard_eligible, reasons: r.hold_reasons.join('; '), source_url: r.source_url,
  })), { newline: '\n' }));
  const recipients = queue.filter(r => r.postcard_eligible).map(r => ({
    region: r.acquisition_scope, addressstreet: r.mailing_street, city: r.city,
    addressstate: r.province, addresszipcode: r.postal_code,
    recipient_name: 'The Residents', mailing_key: r.mailing_key,
    source: r.source, source_listing_id: r.source_listing_id,
  }));
  const manifest = { campaign: 'rental-current-occupant-v1', batch_id: batchId,
    created_at: new Date().toISOString(), recipients, recipient_sha256: digest(recipients),
    delivery_status: 'generated_for_review', physical_mailing_confirmed: false };
  // Build a concrete artifact before reserving it. A transaction collision fails without emailing it.
  await render(manifest, path.join(runDir, 'postcards'));
  if (!recipients.length) { console.log('No qualified rental recipients; saved review artifacts only.'); return manifest; }
  await db(`BEGIN;
    INSERT INTO rental_postcard_batches(batch_id, manifest) VALUES (${quote(batchId)}, ${quote(JSON.stringify(manifest))}::jsonb);
    INSERT INTO rental_postcard_recipients(mailing_key, batch_id, recipient)
      SELECT r->>'mailing_key', ${quote(batchId)}, r FROM jsonb_array_elements(${quote(JSON.stringify(recipients))}::jsonb) r
      ON CONFLICT(mailing_key) DO UPDATE SET batch_id=EXCLUDED.batch_id, recipient=EXCLUDED.recipient, created_at=now()
      WHERE rental_postcard_recipients.created_at <= now() - interval '180 days';
    DO $$ BEGIN
      IF (SELECT count(*) FROM rental_postcard_recipients WHERE batch_id=${quote(batchId)}) <> ${recipients.length}
      THEN RAISE EXCEPTION 'Rental address reservation conflict; batch not authorized'; END IF;
    END $$;
    COMMIT;`);
  console.log(`Rental batch: ${recipients.length} current-occupant recipients; ${queue.length - recipients.length} held/review records.`);
  return manifest;
}
if (require.main === module) build(process.argv[2]).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { build };
