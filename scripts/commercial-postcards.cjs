const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { query } = require('./market-db.cjs');
const { evaluate, key } = require('./commercial-outreach-lib.cjs');
const { digest, renderCommercial } = require('./commercial-artwork.cjs');
const quote = v => `'${String(v).replaceAll("'", "''")}'`;
async function build(runDir, { db = query, render = renderCommercial } = {}) {
  const supplement = process.env.COMMERCIAL_BATCH_SUPPLEMENT || '';
  if (supplement && !/^[a-zA-Z0-9_-]+$/.test(supplement)) throw new Error('Invalid commercial supplement ID');
  const batchId = `commercial-${path.basename(runDir)}${supplement ? '-supplement-' + supplement : ''}`;
  const outputDir = path.join(runDir, supplement ? 'postcards-supplement' : 'postcards');
  const prior = await db(`SELECT manifest FROM commercial_postcard_batches WHERE batch_id=${quote(batchId)}`);
  if (prior.length) { await render(prior[0].manifest, outputDir); fs.writeFileSync(path.join(runDir, 'current-postcard-output.txt'), path.basename(outputDir)); return prior[0].manifest; }
  const records = JSON.parse(fs.readFileSync(path.join(runDir, 'source-records.json')));
  const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json')));
  // If mailing history cannot be read, this throws before a batch is generated.
  const history = await db("SELECT mailing_key, recipient, created_at, batch_id FROM commercial_postcard_recipients WHERE created_at > now() - interval '180 days'");
  const events = new Map((lifecycle.events || []).map(e => [key(e), e.event_type]));
  const queue = records.map(r => evaluate(r, events.get(key(r)) || 'still_active', history, process.env.COMMERCIAL_INITIAL_CAMPAIGN === 'true'));
  const seen = new Set();
  for (const row of queue) {
    if (row.postcard_eligible && seen.has(row.mailing_key)) { row.postcard_eligible = false; row.hold_reasons.push('Duplicate premises in this snapshot'); }
    if (row.postcard_eligible) seen.add(row.mailing_key);
  }
  fs.writeFileSync(path.join(runDir, 'commercial-review-queue.json'), JSON.stringify(queue, null, 2));
  fs.writeFileSync(path.join(runDir, 'commercial-review-queue.csv'), Papa.unparse(queue.map(r => ({
    address: r.mailing_street, city: r.city, region: r.acquisition_scope,
    unit: r.unit_label, event: r.event_type, current_occupancy: r.current_business_occupancy,
    offered_furnishing: r.occupancy_state, confidence: r.classification_confidence,
    score: r.movement_score, eligible: r.postcard_eligible, reasons: r.hold_reasons.join('; '), source_url: r.source_url,
  })), { newline: '\n' }));
  const recipients = queue.filter(r => r.postcard_eligible).map(r => ({
    region: r.acquisition_scope, addressstreet: r.mailing_street, city: r.city,
    addressstate: r.province, addresszipcode: r.postal_code,
    recipient_name: 'The Business Owner', mailing_key: r.mailing_key,
    source: r.source, source_listing_id: r.source_listing_id,
  }));
  const manifest = { campaign: 'commercial-outgoing-business-v1', batch_id: batchId,
    created_at: new Date().toISOString(), recipients, recipient_sha256: digest(recipients),
    delivery_status: 'generated_for_review', supplemental: Boolean(supplement), original_batch_id: supplement ? `commercial-${path.basename(runDir)}` : null, physical_mailing_confirmed: false };
  // Build a concrete artifact before reserving it. A transaction collision fails without emailing it.
  await render(manifest, outputDir);
  if (!recipients.length) { fs.writeFileSync(path.join(runDir, 'current-postcard-output.txt'), path.basename(outputDir)); console.log('No qualified commercial recipients; saved review artifacts only.'); return manifest; }
  await db(`BEGIN;
    INSERT INTO commercial_postcard_batches(batch_id, manifest) VALUES (${quote(batchId)}, ${quote(JSON.stringify(manifest))}::jsonb);
    INSERT INTO commercial_postcard_recipients(mailing_key, batch_id, recipient)
      SELECT r->>'mailing_key', ${quote(batchId)}, r FROM jsonb_array_elements(${quote(JSON.stringify(recipients))}::jsonb) r
      ON CONFLICT(mailing_key) DO UPDATE SET batch_id=EXCLUDED.batch_id, recipient=EXCLUDED.recipient, created_at=now()
      WHERE commercial_postcard_recipients.created_at <= now() - interval '180 days';
    DO $$ BEGIN
      IF (SELECT count(*) FROM commercial_postcard_recipients WHERE batch_id=${quote(batchId)}) <> ${recipients.length}
      THEN RAISE EXCEPTION 'Commercial address reservation conflict; batch not authorized'; END IF;
    END $$;
    COMMIT;`);
  fs.writeFileSync(path.join(runDir, 'current-postcard-output.txt'), path.basename(outputDir));
  console.log(`Commercial batch: ${recipients.length} current-occupant recipients; ${queue.length - recipients.length} held/review records.`);
  return manifest;
}
if (require.main === module) build(process.argv[2]).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { build };
