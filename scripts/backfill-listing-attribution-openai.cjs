#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSupabase } = require('./postcard-lib.cjs');
const { searchListingAttribution } = require('./listing-attribution-openai.cjs');

const ALLOWED_REGIONS = new Set(['windsor', 'london', 'wkg', 'ottawa']);
function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
async function loadCandidates(supabase, region, limit, retryHours) {
  const { data, error } = await supabase.from('listings')
    .select('zpid,region,status,addressstreet,addresscity,addressstate,addresszipcode,city,listing_mls_id,listing_representatives,listing_attribution_attempts,listing_attribution_attempted_at,listing_attribution_status')
    .eq('region', region)
    .in('status', ['active', 'just_listed'])
    .or('listing_representatives.is.null,listing_representatives.eq.[]')
    .order('first_seen_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(1000, limit * 5));
  if (error) throw new Error(`Candidate query failed: ${error.message}`);
  const retryMs = retryHours * 60 * 60 * 1000;
  return (data || []).filter(listing => {
    if (listing.listing_attribution_status !== 'unresolved') return true;
    const attempted = new Date(listing.listing_attribution_attempted_at).getTime();
    return !Number.isFinite(attempted) || Date.now() - attempted >= retryMs;
  }).slice(0, limit);
}
function attributionUpdate(listing, result) {
  const now = new Date().toISOString();
  const update = {
    listing_attribution_attempted_at: now,
    listing_attribution_attempts: (listing.listing_attribution_attempts || 0) + 1,
    listing_mls_id: result.discovered_mls_number || listing.listing_mls_id || null,
    listing_attribution_status: result.status,
    listing_attribution_confidence: result.confidence,
    listing_attribution_sources: result.sources,
  };
  if (result.accepted) Object.assign(update, {
    listing_representatives: result.listing_representatives,
    listing_agent_names: result.listing_representatives.map(rep => rep.name),
    listing_attribution_source: 'openai_web_search',
    listing_attribution_captured_at: now,
  });
  return update;
}
async function main() {
  const region = arg('region', 'london');
  if (!ALLOWED_REGIONS.has(region)) throw new Error(`Unsupported region: ${region}`);
  const limit = Math.max(1, Math.min(100, Number.parseInt(arg('limit', '10'), 10)));
  const concurrency = Math.max(1, Math.min(5, Number.parseInt(arg('concurrency', '2'), 10)));
  const retryHours = Math.max(1, Number.parseInt(arg('retry-hours', '72'), 10));
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
  const supabase = getSupabase();
  const candidates = await loadCandidates(supabase, region, limit, retryHours);
  console.log(`[${region}] OpenAI candidates=${candidates.length}, dry_run=${dryRun}`);
  const summary = { candidates: candidates.length, verified: 0, high_confidence: 0, unresolved: 0, failed: 0 };
  let cursor = 0;
  let quotaExhausted = false;
  async function worker() {
    while (cursor < candidates.length && !quotaExhausted) {
      const listing = candidates[cursor++];
      const label = `${listing.zpid} ${listing.addressstreet}, ${listing.addresscity || listing.city}`;
      try {
        const result = await searchListingAttribution(listing, { apiKey: process.env.OPENAI_API_KEY });
        summary[result.status]++;
        console.log(JSON.stringify({
          listing: label, status: result.status, confidence: result.confidence,
          mls: result.discovered_mls_number,
          agents: result.listing_representatives.map(rep => rep.name),
          sources: result.sources.map(source => source.url),
        }));
        if (!dryRun) {
          const { error } = await supabase.from('listings').update(attributionUpdate(listing, result))
            .eq('zpid', listing.zpid)
            .or('listing_representatives.is.null,listing_representatives.eq.[]');
          if (error) throw new Error(`Checkpoint failed: ${error.message}`);
        }
      } catch (error) {
        summary.failed++;
        console.error(JSON.stringify({ listing: label, error: error.message }));
        if (error.status === 429 && /quota|billing/i.test(error.message)) {
          quotaExhausted = true;
          console.error('OpenAI quota exhausted; stopping this batch without consuming more attempts.');
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(JSON.stringify(summary));
  if (summary.failed && !dryRun) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exit(1); });
module.exports = { attributionUpdate };
