#!/usr/bin/env node
/**
 * Probe: Check what agent/attribution data already exists in our listings DB
 *
 * Looks at carouselphotos + any agent fields stored from Apify detail scraper.
 * Also checks raw listing fields for brokerage hints.
 *
 * Usage: node scripts/probe-attribution-info.cjs
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getSupabase } = require('./postcard-lib.cjs');

const REGIONS = ['windsor', 'chatham', 'london', 'wkg'];

async function main() {
  const supabase = getSupabase();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         Attribution Info Probe — All Regions            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Pull a broad sample of recent listings with all columns
  const { data, error } = await supabase
    .from('listings')
    .select('zpid, status, addressstreet, city, addressstate, detailurl, carouselphotos, lastseenat')
    .in('status', ['just_listed', 'active', 'sold'])
    .order('lastseenat', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  console.log(`Loaded ${data.length} recent listings\n`);

  // ── 1. Show what columns came back (non-error ones exist in schema) ──
  if (data.length > 0) {
    console.log('═'.repeat(60));
    console.log('COLUMNS RETURNED (exist in schema):');
    console.log('═'.repeat(60));
    const cols = Object.keys(data[0]);
    cols.forEach(c => console.log(`  ${c}`));
    console.log('');
  }

  // ── 2. Agent/brokerage-related fields ──
  const agentFields = Object.keys(data[0] || {}).filter(k =>
    /agent|broker|realtor|attribution|contact|phone|email|listing_by|office/i.test(k)
  );

  console.log('═'.repeat(60));
  console.log('AGENT-RELATED FIELDS FOUND:');
  console.log('═'.repeat(60));
  if (agentFields.length === 0) {
    console.log('  None found in schema');
  } else {
    agentFields.forEach(f => console.log(`  ${f}`));
  }
  console.log('');

  // ── 3. Show non-null values for each agent field ──
  for (const field of agentFields) {
    const withValue = data.filter(l => l[field] != null && l[field] !== '');
    if (withValue.length > 0) {
      console.log(`  ${field} — ${withValue.length}/${data.length} listings have a value`);
      withValue.slice(0, 3).forEach(l => {
        console.log(`    zpid ${l.zpid}: ${JSON.stringify(l[field]).slice(0, 120)}`);
      });
    } else {
      console.log(`  ${field} — all null/empty`);
    }
  }
  console.log('');

  // ── 4. Check carouselphotos for hidden agent metadata ──
  console.log('═'.repeat(60));
  console.log('CAROUSELPHOTOS SAMPLE (checking for agent metadata):');
  console.log('═'.repeat(60));
  const withPhotos = data.filter(l => l.carouselphotos);
  console.log(`  ${withPhotos.length}/${data.length} listings have carouselphotos\n`);

  if (withPhotos.length > 0) {
    const sample = withPhotos[0];
    let photos = sample.carouselphotos;
    if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch(e) {} }
    if (Array.isArray(photos) && photos[0]) {
      console.log('  First photo object keys:', Object.keys(photos[0]).join(', '));
      console.log('  Sample:', JSON.stringify(photos[0]).slice(0, 200));
    }
  }
  console.log('');

  // ── 5. Check detailurl for brokerage hints ──
  console.log('═'.repeat(60));
  console.log('DETAILURL SAMPLES:');
  console.log('═'.repeat(60));
  data.slice(0, 5).forEach(l => {
    console.log(`  zpid ${l.zpid}: ${(l.detailurl || '').slice(0, 100)}`);
  });
  console.log('');

  // ── 6. Coverage summary ──
  console.log('═'.repeat(60));
  console.log('COVERAGE SUMMARY:');
  console.log('═'.repeat(60));
  const hasPhotos2 = data.filter(l => l.carouselphotos).length;
  const hasDetailUrl = data.filter(l => l.detailurl).length;
  console.log(`  Has carouselphotos: ${hasPhotos2}/${data.length}`);
  console.log(`  Has detailurl:      ${hasDetailUrl}/${data.length}`);
  console.log(`\n  NOTE: No brokerage/agent columns exist yet in listings table.`);
  console.log(`  Step 7 will need to add them OR use a separate realtors table.`);
  console.log('');

  // ── 7. Raw sample of 3 listings — full object ──
  console.log('═'.repeat(60));
  console.log('FULL RAW SAMPLE (3 listings — all fields):');
  console.log('═'.repeat(60));
  data.slice(0, 3).forEach((l, i) => {
    console.log(`\n  [${i + 1}] zpid ${l.zpid} — ${l.addressstreet}, ${l.city} — ${l.status}`);
    Object.entries(l).forEach(([k, v]) => {
      if (v == null || v === '') return;
      const str = typeof v === 'object' ? JSON.stringify(v).slice(0, 100) : String(v).slice(0, 100);
      console.log(`      ${k}: ${str}`);
    });
  });
}

main().catch(err => {
  console.error('Probe failed:', err.message);
  process.exit(1);
});
