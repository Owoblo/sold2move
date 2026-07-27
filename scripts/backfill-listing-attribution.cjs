#!/usr/bin/env node
/**
 * Resumable one-time attribution backfill for active/just-listed properties.
 *
 * Progress is checkpointed directly on each Supabase row. Re-running safely
 * skips successes and recent failures, so GitHub timeouts never restart work.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getSupabase } = require('./postcard-lib.cjs');
const { fetchDetailsViaApify } = require('./postcard-step2-photos.cjs');

const ALLOWED_REGIONS = new Set(['windsor', 'london', 'wkg', 'ottawa']);

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasRepresentatives(row) {
  let reps = row.listing_representatives;
  if (typeof reps === 'string') {
    try { reps = JSON.parse(reps); } catch (_) { reps = []; }
  }
  return Array.isArray(reps) && reps.length > 0;
}

function eligibleForRetry(row, retryHours, maxAttempts) {
  if (hasRepresentatives(row)) return false;
  if ((row.listing_attribution_attempts || 0) >= maxAttempts) return false;
  if (!row.listing_attribution_attempted_at) return true;
  const attempted = new Date(row.listing_attribution_attempted_at).getTime();
  return !Number.isFinite(attempted) ||
    Date.now() - attempted >= retryHours * 60 * 60 * 1000;
}

async function loadCandidates(supabase, region, limit, retryHours, maxAttempts) {
  const pageSize = 1000;
  const candidates = [];
  for (let offset = 0; candidates.length < limit; offset += pageSize) {
    const { data, error } = await supabase
      .from('listings')
      .select(
        'zpid,region,status,addressstreet,addresscity,addressstate,addresszipcode,city,' +
        'listing_representatives,listing_attribution_attempted_at,listing_attribution_attempts'
      )
      .eq('region', region)
      .in('status', ['active', 'just_listed'])
      .order('first_seen_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Supabase candidate query failed: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) {
      if (eligibleForRetry(row, retryHours, maxAttempts)) candidates.push(row);
      if (candidates.length >= limit) break;
    }
    if (data.length < pageSize) break;
  }
  return candidates;
}

async function checkpoint(supabase, listing, attribution) {
  const now = new Date().toISOString();
  const successful = attribution?.listing_representatives?.length > 0;
  const update = {
    listing_attribution_attempted_at: now,
    listing_attribution_attempts: (listing.listing_attribution_attempts || 0) + 1,
  };
  if (successful) Object.assign(update, attribution);
  const { error } = await supabase.from('listings').update(update).eq('zpid', listing.zpid);
  if (error) throw new Error(`Checkpoint failed for ${listing.zpid}: ${error.message}`);
  return successful;
}

async function main() {
  const region = arg('region', '');
  if (!ALLOWED_REGIONS.has(region)) {
    throw new Error(`--region must be one of: ${[...ALLOWED_REGIONS].join(', ')}`);
  }
  const limit = Math.max(1, Number.parseInt(arg('limit', '500'), 10));
  const chunkSize = Math.min(100, Math.max(1, Number.parseInt(arg('chunk-size', '50'), 10)));
  const retryHours = Math.max(1, Number.parseInt(arg('retry-hours', '72'), 10));
  const maxAttempts = Math.max(1, Number.parseInt(arg('max-attempts', '3'), 10));
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN is required');

  const supabase = getSupabase();
  const candidates = await loadCandidates(supabase, region, limit, retryHours, maxAttempts);
  console.log(`[${region}] ${candidates.length} eligible active/just-listed records`);
  let enriched = 0;
  let attempted = 0;

  for (let index = 0; index < candidates.length; index += chunkSize) {
    const chunk = candidates.slice(index, index + chunkSize);
    console.log(`[${region}] chunk ${Math.floor(index / chunkSize) + 1}/${Math.ceil(candidates.length / chunkSize)} (${chunk.length})`);
    let results;
    try {
      results = await fetchDetailsViaApify(chunk, token);
    } catch (error) {
      // Do not checkpoint actor-level failures. A later run should retry the
      // entire chunk because no trustworthy per-property result was returned.
      console.error(`[${region}] actor chunk failed: ${error.message}`);
      continue;
    }
    for (const listing of chunk) {
      const detail = results.get(String(listing.zpid));
      if (await checkpoint(supabase, listing, detail?.attribution)) enriched++;
      attempted++;
    }
    console.log(`[${region}] checkpointed=${attempted}, enriched=${enriched}`);
  }

  console.log(JSON.stringify({ region, candidates: candidates.length, attempted, enriched }));
}

main().catch(error => {
  console.error('Attribution backfill failed:', error.message);
  process.exit(1);
});
