#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSupabase } = require('./postcard-lib.cjs');
const { searchListingAttribution } = require('./listing-attribution-openai.cjs');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
function names(value) {
  return (value || []).map(name => String(name).toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean).sort();
}
function sameNames(left, right) {
  return JSON.stringify(names(left)) === JSON.stringify(names(right));
}
async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
  const count = Math.max(1, Math.min(50, Number.parseInt(arg('count', '30'), 10)));
  const concurrency = Math.max(1, Math.min(5, Number.parseInt(arg('concurrency', '3'), 10)));
  const model = arg('model', 'gpt-5-mini');
  const supabase = getSupabase();
  const { data, error } = await supabase.from('listings')
    .select('zpid,region,addressstreet,addresscity,addressstate,addresszipcode,city,listing_mls_id,listing_agent_names,listing_attribution_sources')
    .eq('listing_attribution_source', 'openai_web_search')
    .eq('listing_attribution_status', 'verified')
    .order('listing_attribution_captured_at', { ascending: false })
    .limit(count * 4);
  if (error) throw new Error(`Audit query failed: ${error.message}`);
  // Spread the sample across the recent population instead of auditing one contiguous batch.
  const stride = Math.max(1, Math.floor((data || []).length / count));
  const sample = (data || []).filter((_, index) => index % stride === 0).slice(0, count);
  const summary = { sampled: sample.length, confirmed: 0, mismatch: 0, inconclusive: 0, failed: 0 };
  let cursor = 0;
  async function worker() {
    while (cursor < sample.length) {
      const listing = sample[cursor++];
      try {
        const result = await searchListingAttribution(listing, {
          apiKey: process.env.OPENAI_API_KEY, model, pass: 'second', timeoutMs: 180000,
        });
        const audited = result.listing_representatives.map(rep => rep.name);
        let outcome = 'inconclusive';
        if (result.accepted && sameNames(listing.listing_agent_names, audited)) outcome = 'confirmed';
        else if (result.accepted) outcome = 'mismatch';
        summary[outcome]++;
        console.log(JSON.stringify({
          zpid: listing.zpid, address: listing.addressstreet,
          stored: listing.listing_agent_names, audited, outcome,
          audit_status: result.status, sources: result.sources.map(source => source.url),
        }));
      } catch (error) {
        summary.failed++;
        console.error(JSON.stringify({ zpid: listing.zpid, error: error.message }));
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const decisive = summary.confirmed + summary.mismatch;
  summary.measured_precision = decisive ? summary.confirmed / decisive : null;
  console.log(JSON.stringify(summary));
  if (summary.failed || summary.mismatch) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exit(1); });
