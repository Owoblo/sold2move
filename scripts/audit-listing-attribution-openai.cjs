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
function nameOverlap(left, right) {
  const rightNames = new Set(names(right));
  return names(left).filter(name => rightNames.has(name));
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
    .limit(count * 4);
  if (error) throw new Error(`Audit query failed: ${error.message}`);
  // Spread the sample across the recent population instead of auditing one contiguous batch.
  const stride = Math.max(1, Math.floor((data || []).length / count));
  const sample = (data || []).filter((_, index) => index % stride === 0).slice(0, count);
  const summary = {
    sampled: sample.length,
    exact_match: 0,
    stored_names_supported: 0,
    partial_match: 0,
    mismatch: 0,
    inconclusive: 0,
    failed: 0,
  };
  let cursor = 0;
  async function worker() {
    while (cursor < sample.length) {
      const listing = sample[cursor++];
      try {
        const result = await searchListingAttribution(listing, {
          apiKey: process.env.OPENAI_API_KEY, model, pass: 'second', timeoutMs: 180000,
        });
        const audited = result.listing_representatives.map(rep => rep.name);
        const stored = listing.listing_agent_names || [];
        const overlap = nameOverlap(stored, audited);
        let outcome = 'inconclusive';
        // The independent search may find the same person without reaching the
        // stricter write threshold. That is still valid support for the stored
        // primary name. Extra co-listing representatives affect completeness,
        // not the correctness of an already-supported name.
        if (audited.length && sameNames(stored, audited)) outcome = 'exact_match';
        else if (stored.length && overlap.length === stored.length) outcome = 'stored_names_supported';
        else if (overlap.length) outcome = 'partial_match';
        else if (result.accepted && audited.length) outcome = 'mismatch';
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
  const supported = summary.exact_match + summary.stored_names_supported;
  const decisive = supported + summary.partial_match + summary.mismatch;
  summary.primary_name_precision = decisive ? supported / decisive : null;
  summary.exact_set_rate = sample.length ? summary.exact_match / sample.length : null;
  summary.independent_support_rate = sample.length ? supported / sample.length : null;
  console.log(JSON.stringify(summary));
  if (summary.failed || summary.mismatch) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exit(1); });
