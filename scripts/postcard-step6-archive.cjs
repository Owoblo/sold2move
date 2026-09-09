#!/usr/bin/env node
/**
 * Step 6: Stage generated mailing batch.
 *
 * Generating CSV/PDF artifacts is not proof that mail was submitted or sent.
 * This step records a generated batch and its immutable candidate set, but it
 * deliberately does not mutate listing send timestamps or lifecycle status.
 * Use postcard-confirm-mailed.cjs only after the printer/mail handoff occurs.
 */

const { serviceClient, propertyKey } = require('./pipeline-review-lib.cjs');
const { stepHeader, writePipelineFile } = require('./postcard-lib.cjs');

async function run(options, finalListings) {
  stepHeader(6, 'Stage Generated Mailing Batch');
  const generatedAt = new Date().toISOString();
  const batchId = options?.batchId || `batch-${generatedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const items = (finalListings || []).map(listing => ({
    zpid: listing.zpid,
    property_key: propertyKey(listing),
    postcard_type: listing.status === 'sold' ? 'sold' : 'just_listed',
    address: listing.address || listing.addressstreet,
    city: listing.city || listing.addresscity,
    postal_code: listing.addresszipcode || null,
  }));
  const manifest = {
    batch_id: batchId,
    region: options?.region || 'windsor',
    status: 'generated',
    generated_at: generatedAt,
    record_count: items.length,
    items,
    notice: 'Successful printer submission reserves these postcards against repeat printing.',
  };
  writePipelineFile('batch-manifest.json', manifest);

  if (items.length === 0) {
    console.log('  Empty batch recorded; no lifecycle changes made.');
    return manifest;
  }

  if (options?.dryRun) return manifest;
  const supabase = serviceClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required to persist the print batch');
  }

  const { error } = await supabase.rpc('stage_postcard_batch', {
    p_batch_id: batchId,
    p_region: manifest.region,
    p_items: items,
  });
  if (error) throw new Error(`Failed to stage mailing batch ${batchId}: ${error.message}`);
  console.log(`  ✓ Staged ${items.length} generated item(s) in mail batch ${batchId}`);
  console.log('  No listing has been marked sent.');
  return manifest;
}

module.exports = { run };
