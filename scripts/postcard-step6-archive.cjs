#!/usr/bin/env node
/**
 * Step 6: Archive Sold Listings
 *
 * After postcards have been generated, moves sold listings into sold_archive
 * and removes them from the main listings table.
 *
 * This prevents:
 *   1. Duplicate sold postcards on future runs
 *   2. Clutter in the main listings table
 *
 * The sold_archive is also used by the scraper for glitch detection —
 * if a listing reappears on Zillow after being archived, it gets flagged
 * as glitch_suspected instead of just_listed.
 */

const {
  getSupabase,
  stepHeader,
  parseCliArgs,
} = require('./postcard-lib.cjs');

async function run(options, finalListings) {
  stepHeader(6, 'Clean Slate — Archive Sold, Reset Just Listed');

  if (!finalListings || finalListings.length === 0) {
    console.log('  No listings to process.');
    return;
  }

  const soldListings = finalListings.filter(l => l.status === 'sold');
  const justListedListings = finalListings.filter(l => l.status === 'just_listed');
  const sentAt = new Date().toISOString();
  const batchId = options?.batchId || `batch-${sentAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;

  console.log(`  Sold to archive: ${soldListings.length}`);
  console.log(`  Just listed to reset → active: ${justListedListings.length}`);
  console.log(`  Batch ID: ${batchId}`);

  const supabase = getSupabase();

  // Per-row updates so we can increment postcard_send_count from each row's
  // current value (Supabase JS .update() doesn't support `col = col + 1`
  // expressions without an RPC). Loop is bounded by batch size; for a few
  // hundred rows the wall-clock cost is small.
  let archived = 0;
  for (const l of soldListings) {
    const nextCount = (l.postcard_send_count || 0) + 1;
    const { error } = await supabase
      .from('listings')
      .update({
        status: 'sold_archived',
        sold_postcard_sent_at: sentAt,
        last_postcard_sent_at: sentAt,
        last_postcard_batch_id: batchId,
        last_postcard_type_sent: 'sold',
        postcard_skip_reason: null,
        postcard_send_count: nextCount,
      })
      .eq('zpid', l.zpid);
    if (error) console.error(`  Failed to archive zpid ${l.zpid}:`, error.message);
    else archived++;
  }

  // Mark just_listed listings as active — clean slate for next scrape
  let reset = 0;
  for (const l of justListedListings) {
    const nextCount = (l.postcard_send_count || 0) + 1;
    const { error } = await supabase
      .from('listings')
      .update({
        status: 'active',
        just_listed_postcard_sent_at: sentAt,
        last_postcard_sent_at: sentAt,
        last_postcard_batch_id: batchId,
        last_postcard_type_sent: 'just_listed',
        postcard_skip_reason: null,
        postcard_send_count: nextCount,
      })
      .eq('zpid', l.zpid);
    if (error) console.error(`  Failed to reset zpid ${l.zpid}:`, error.message);
    else reset++;
  }

  console.log(`  ✓ ${archived} sold → sold_archived`);
  console.log(`  ✓ ${reset} just_listed → active`);
}

if (require.main === module) {
  run(null, []).catch(err => {
    console.error('Step 6 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
