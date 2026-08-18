#!/usr/bin/env node
/**
 * Step 6: Stage generated mailing batch.
 *
 * Generating CSV/PDF artifacts is not proof that mail was submitted or sent.
 * This step records a generated batch and its immutable candidate set, but it
 * deliberately does not mutate listing send timestamps or lifecycle status.
 * Use postcard-confirm-mailed.cjs only after the printer/mail handoff occurs.
 */

const { createClient } = require('@supabase/supabase-js');
const { stepHeader, writePipelineFile } = require('./postcard-lib.cjs');

function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function run(options, finalListings) {
  stepHeader(6, 'Stage Generated Mailing Batch');
  const generatedAt = new Date().toISOString();
  const batchId = options?.batchId || `batch-${generatedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const items = (finalListings || []).map(listing => ({
    zpid: listing.zpid,
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
    notice: 'Generated is not sent. Confirm printer/mail handoff separately.',
  };
  writePipelineFile('batch-manifest.json', manifest);

  if (items.length === 0) {
    console.log('  Empty batch recorded; no lifecycle changes made.');
    return manifest;
  }

  const supabase = serviceClient();
  if (!supabase) {
    console.warn('  SUPABASE_SERVICE_ROLE_KEY not set; batch staged in its local manifest only.');
    console.warn('  No listing was marked sent or archived.');
    return manifest;
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
