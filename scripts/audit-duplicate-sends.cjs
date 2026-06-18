#!/usr/bin/env node
/**
 * One-time audit: find addresses that received postcards under MULTIPLE zpids.
 *
 * These are relisted properties (taken off-market, reposted with a new zpid)
 * that slipped past the old zpid-keyed dedup and may have received duplicate
 * postcards. Tells us the blast radius of the relist bug before the Step 5
 * address-guard fix.
 *
 * Read-only — does not modify anything.
 *
 * Usage:
 *   node scripts/audit-duplicate-sends.cjs            (all regions)
 *   node scripts/audit-duplicate-sends.cjs --region wkg
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getSupabase } = require('./postcard-lib.cjs');

function normalizeAddressKey(row) {
  const clean = (s) => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${clean(row.addressstreet)}|${clean(row.addresszipcode)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const regionArg = (args.find(a => a === '--region') ? args[args.indexOf('--region') + 1] : null);

  const supabase = getSupabase();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      Duplicate Postcard Send Audit (read-only)          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  if (regionArg) console.log(`  Region filter: ${regionArg}`);
  console.log('');

  // Paginate through all rows that ever received a postcard. Keep columns
  // minimal so the query stays light even on a slow connection.
  const PAGE = 1000;
  let from = 0;
  let all = [];
  for (;;) {
    let q = supabase
      .from('listings')
      .select('zpid, region, addressstreet, addresszipcode, city, status, just_listed_postcard_sent_at, sold_postcard_sent_at')
      .or('just_listed_postcard_sent_at.not.is.null,sold_postcard_sent_at.not.is.null')
      .order('addressstreet', { ascending: true })
      .range(from, from + PAGE - 1);
    if (regionArg) q = q.eq('region', regionArg);

    const { data, error } = await q;
    if (error) {
      console.error(`  Query failed at offset ${from}: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    process.stdout.write(`  Loaded ${all.length} sent listings...\r`);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`\n  Total listings that received a postcard: ${all.length}\n`);

  // Group by normalized address.
  const byAddress = new Map();
  for (const row of all) {
    const key = normalizeAddressKey(row);
    if (!key || key === '|') continue;
    const entry = byAddress.get(key) || { rows: [], jlSends: 0, soldSends: 0 };
    entry.rows.push(row);
    if (row.just_listed_postcard_sent_at) entry.jlSends++;
    if (row.sold_postcard_sent_at) entry.soldSends++;
    byAddress.set(key, entry);
  }

  // Flag addresses with duplicate sends of the same type (the actual problem).
  const dupes = [];
  for (const [key, entry] of byAddress) {
    const zpids = new Set(entry.rows.map(r => String(r.zpid)));
    const multiZpid = zpids.size > 1;
    if (entry.jlSends > 1 || entry.soldSends > 1) {
      dupes.push({ key, entry, zpids, multiZpid });
    }
  }

  dupes.sort((a, b) => (b.entry.jlSends + b.entry.soldSends) - (a.entry.jlSends + a.entry.soldSends));

  console.log('═'.repeat(60));
  console.log('ADDRESSES WITH DUPLICATE SENDS OF THE SAME TYPE:');
  console.log('═'.repeat(60));
  if (dupes.length === 0) {
    console.log('  None found. 🎉');
  } else {
    for (const d of dupes) {
      const sample = d.entry.rows[0];
      const totalCards = d.entry.jlSends + d.entry.soldSends;
      console.log(`\n  ${sample.addressstreet}, ${sample.city || ''} ${sample.addresszipcode || ''} [${sample.region}]`);
      console.log(`    Total postcards sent: ${totalCards}  (just_listed: ${d.entry.jlSends}, sold: ${d.entry.soldSends})`);
      console.log(`    Distinct zpids: ${d.zpids.size} → ${[...d.zpids].join(', ')}`);
    }
  }

  // Summary stats.
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY:');
  console.log('═'.repeat(60));
  const multiZpidAddrs = [...byAddress.values()].filter(e => new Set(e.rows.map(r => String(r.zpid))).size > 1);
  const totalExtraCards = dupes.reduce((sum, d) => {
    const extra = Math.max(0, d.entry.jlSends - 1) + Math.max(0, d.entry.soldSends - 1);
    return sum + extra;
  }, 0);
  console.log(`  Unique addresses that got a postcard:      ${byAddress.size}`);
  console.log(`  Addresses appearing under multiple zpids:  ${multiZpidAddrs.length}`);
  console.log(`  Addresses with DUPLICATE same-type sends:  ${dupes.length}`);
  console.log(`  Estimated extra (duplicate) postcards sent: ${totalExtraCards}`);
  console.log('');
  console.log('  Going forward these are all blocked by the Step 5 address guard.');
}

main().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
