#!/usr/bin/env node
/**
 * Test: Realtor Lookup via OpenAI web search + extraction
 *
 * Pulls real active listings from Supabase and tests agent lookup accuracy.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/test-realtor-lookup.cjs
 *
 * Options:
 *   --region=windsor|london|wkg|chatham   (default: all)
 *   --count=N                              (default: 3 per region)
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getSupabase } = require('./postcard-lib.cjs');

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Parse CLI args
const args = process.argv.slice(2);
const regionArg = (args.find(a => a.startsWith('--region=')) || '').replace('--region=', '') || null;
const countArg = parseInt((args.find(a => a.startsWith('--count=')) || '').replace('--count=', '') || '3', 10);

const REGIONS_TO_TEST = regionArg
  ? [regionArg]
  : ['windsor', 'chatham', 'london', 'wkg'];

// ─── OpenAI with web search ───────────────────────────────────────────────────
function openaiWebSearch(address, brokerage) {
  const prompt = `Search the web for the listing agent/realtor for this Canadian property that is currently or was recently for sale:

Address: ${address}
${brokerage ? `Known brokerage: ${brokerage}` : ''}

Search for this exact address on realtor.ca, brokerage websites, HouseSigma, Zolo, Point2Homes, and any MLS listing sites.

Return ONLY valid JSON with no other text:
{
  "listing_agent": "full name or null",
  "co_listing_agent": "full name or null",
  "brokerage": "brokerage name or null",
  "agent_phone": "phone or null",
  "agent_email": "email or null",
  "source_url": "URL where you found this or null",
  "confidence": 0-100,
  "confidence_reason": "brief explanation"
}

Rules:
- Only return names explicitly listed as the listing agent for THIS exact property
- If you find the brokerage but not the specific agent, still return the brokerage
- ${brokerage ? `Cross-check: brokerage should match "${brokerage}" — lower confidence if it doesn't` : ''}
- If you cannot find reliable info, set confidence below 30
- NEVER guess or hallucinate — only report what you actually found`;

  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    tools: [{ type: 'web_search_preview' }],
    input: prompt,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let text = '';
          if (parsed.output) {
            for (const item of parsed.output) {
              if (item.type === 'message' && item.content) {
                for (const block of item.content) {
                  if (block.type === 'output_text') text += block.text;
                }
              }
            }
          }
          if (!text && parsed.error) {
            resolve({ confidence: 0, confidence_reason: 'API error: ' + (parsed.error.message || JSON.stringify(parsed.error)) });
            return;
          }
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve({ confidence: 0, confidence_reason: 'No JSON in response' });
          }
        } catch (e) {
          resolve({ confidence: 0, confidence_reason: 'Parse error: ' + e.message });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('OpenAI timeout')); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchListingsForRegion(supabase, region, count) {
  const { getRegionConfig } = require('./postcard-region-config.cjs');
  const config = getRegionConfig(region);

  const { data, error } = await supabase
    .from('listings')
    .select('zpid, addressstreet, city, addressstate, addresszipcode, status, unformattedprice, carouselphotos, detailurl')
    .in('status', ['just_listed', 'active'])
    .in('city', config.cities)
    .not('addressstreet', 'is', null)
    .order('lastseenat', { ascending: false })
    .limit(count * 3); // fetch extra so we can pick ones with good addresses

  if (error) throw new Error(`Supabase error for ${region}: ${error.message}`);

  // Prefer listings with a street number
  const valid = (data || []).filter(l => l.addressstreet && /^\d/.test(l.addressstreet));
  return valid.slice(0, count);
}

async function main() {
  if (!OPENAI_KEY) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }

  const supabase = getSupabase();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Realtor Lookup Test — Real Listings from Supabase   ║');
  console.log('║     Method: OpenAI web_search_preview                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Regions: ${REGIONS_TO_TEST.join(', ')}   Listings per region: ${countArg}\n`);

  const summary = { total: 0, found: 0, partial: 0, notFound: 0 };

  for (const region of REGIONS_TO_TEST) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  REGION: ${region.toUpperCase()}`);
    console.log('═'.repeat(60));

    let listings;
    try {
      listings = await fetchListingsForRegion(supabase, region, countArg);
    } catch (err) {
      console.error(`  Failed to fetch listings for ${region}: ${err.message}`);
      continue;
    }

    if (listings.length === 0) {
      console.log('  No active listings found in DB for this region.');
      continue;
    }

    console.log(`  Found ${listings.length} listings to test\n`);

    for (const listing of listings) {
      const address = `${listing.addressstreet}, ${listing.city}, ${listing.addressstate || 'ON'}${listing.addresszipcode ? ' ' + listing.addresszipcode : ''}`;
      const price = listing.unformattedprice ? `$${listing.unformattedprice.toLocaleString()}` : 'N/A';

      console.log(`  ── zpid ${listing.zpid} ─ ${address} ─ ${price}`);
      console.log('     Searching...');

      try {
        const result = await openaiWebSearch(address, null);

        const icon = result.confidence >= 70 ? '✅' : result.confidence >= 40 ? '⚠️ ' : '❌';
        console.log(`     ${icon} Confidence: ${result.confidence}%`);
        if (result.listing_agent) console.log(`     Agent:     ${result.listing_agent}`);
        if (result.co_listing_agent) console.log(`     Co-agent:  ${result.co_listing_agent}`);
        if (result.brokerage) console.log(`     Brokerage: ${result.brokerage}`);
        if (result.agent_phone) console.log(`     Phone:     ${result.agent_phone}`);
        if (result.agent_email) console.log(`     Email:     ${result.agent_email}`);
        if (result.source_url) console.log(`     Source:    ${result.source_url}`);
        console.log(`     Reason:    ${result.confidence_reason}`);

        summary.total++;
        if (result.confidence >= 70) summary.found++;
        else if (result.confidence >= 30) summary.partial++;
        else summary.notFound++;

      } catch (err) {
        console.error(`     Error: ${err.message}`);
        summary.total++;
        summary.notFound++;
      }

      console.log('');
      await sleep(2000); // be nice to OpenAI rate limits
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total tested:     ${summary.total}`);
  console.log(`  ✅ Found (≥70%):  ${summary.found}`);
  console.log(`  ⚠️  Partial (≥30%): ${summary.partial}`);
  console.log(`  ❌ Not found:     ${summary.notFound}`);
  const hitRate = summary.total > 0 ? Math.round((summary.found / summary.total) * 100) : 0;
  console.log(`  Hit rate:         ${hitRate}%`);
  console.log('═'.repeat(60));
  console.log('\n  Decision guide:');
  console.log('  ≥60% hit rate → build Step 7 with OpenAI web search as primary');
  console.log('  30-60% hit rate → use Zillow attributionInfo first, web search as fallback');
  console.log('  <30% hit rate → rely on Zillow attributionInfo only, skip web search');
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
