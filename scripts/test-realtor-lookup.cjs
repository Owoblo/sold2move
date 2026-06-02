#!/usr/bin/env node
/**
 * Test: Realtor Lookup via Bing Search + OpenAI extraction
 * Tests 4 addresses — one per region — to validate accuracy before building step 7.
 */

const https = require('https');

const BING_KEY = process.env.BING_SEARCH_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ─── Test listings — one per region ──────────────────────────────────────────
const TEST_LISTINGS = [
  {
    region: 'Windsor / Essex',
    addressstreet: '1 Oak Ct',
    city: 'Essex',
    addressstate: 'ON',
    addresszipcode: 'N0R 1J0',
    brokerage: '',
    price: '',
  },
  {
    region: 'Chatham-Kent',
    addressstreet: '55 Murray St',
    city: 'Chatham',
    addressstate: 'ON',
    addresszipcode: '',
    brokerage: '',
    price: '',
  },
  {
    region: 'London / Middlesex',
    addressstreet: '234 Commissioners Rd W',
    city: 'London',
    addressstate: 'ON',
    addresszipcode: '',
    brokerage: '',
    price: '',
  },
  {
    region: 'Kitchener / Waterloo',
    addressstreet: '10 Dalhousie St',
    city: 'Cambridge',
    addressstate: 'ON',
    addresszipcode: '',
    brokerage: '',
    price: '',
  },
];

// ─── Bing Search ──────────────────────────────────────────────────────────────
function bingSearch(query) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(query);
    const options = {
      hostname: 'api.bing.microsoft.com',
      path: `/v7.0/search?q=${encoded}&count=8&mkt=en-CA&responseFilter=Webpages`,
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': BING_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const pages = parsed?.webPages?.value || [];
          resolve(pages.map(p => ({
            name: p.name,
            url: p.url,
            snippet: p.snippet,
          })));
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Bing timeout')); });
    req.end();
  });
}

// ─── OpenAI Extraction ────────────────────────────────────────────────────────
function openaiExtract(address, brokerage, searchResults) {
  const snippets = searchResults
    .map((r, i) => `[${i + 1}] ${r.name}\n${r.url}\n${r.snippet}`)
    .join('\n\n');

  const prompt = `You are extracting real estate listing agent info from web search snippets.

Property: ${address}
${brokerage ? `Known brokerage from our database: ${brokerage}` : ''}

Search results:
${snippets}

Extract the listing agent info. Return ONLY valid JSON, no explanation:
{
  "listing_agent": "full name or null",
  "co_listing_agent": "full name or null",
  "brokerage": "brokerage name or null",
  "agent_phone": "phone number or null",
  "agent_email": "email or null",
  "source_url": "the URL this came from or null",
  "confidence": 0-100,
  "confidence_reason": "brief explanation"
}

Rules:
- Only extract names explicitly shown as listing agent/realtor for THIS exact address
- If brokerage is known, penalize any result where brokerage doesn't match
- If unsure, set confidence below 50
- Never guess or infer names not present in the snippets`;

  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 400,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
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
          const text = parsed.choices?.[0]?.message?.content || '{}';
          const json = text.replace(/```json|```/g, '').trim();
          resolve(JSON.parse(json));
        } catch (e) {
          resolve({ confidence: 0, confidence_reason: 'Parse error: ' + e.message });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('OpenAI timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function testListing(listing) {
  const address = `${listing.addressstreet}, ${listing.city}, ${listing.addressstate}${listing.addresszipcode ? ' ' + listing.addresszipcode : ''}`;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Region: ${listing.region}`);
  console.log(`  Address: ${address}`);
  if (listing.brokerage) console.log(`  Known brokerage: ${listing.brokerage}`);
  console.log(`${'═'.repeat(60)}`);

  // Build search queries — use brokerage as extra signal if available
  const brokerageClue = listing.brokerage ? ` "${listing.brokerage}"` : '';
  const queries = [
    `"${listing.addressstreet}" "${listing.city}" ON listing agent realtor${brokerageClue}`,
    `"${listing.addressstreet}" "${listing.city}" Ontario MLS realtor.ca`,
  ];

  let allResults = [];
  for (const q of queries) {
    console.log(`  🔍 Searching: ${q}`);
    const results = await bingSearch(q);
    console.log(`     → ${results.length} results`);
    allResults = allResults.concat(results);
    // Small delay between searches
    await new Promise(r => setTimeout(r, 500));
  }

  // Dedupe by URL
  const seen = new Set();
  allResults = allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  console.log(`  Total unique results: ${allResults.length}`);

  if (allResults.length === 0) {
    console.log('  ❌ No search results found');
    return;
  }

  // Show raw snippets
  console.log('\n  Raw snippets:');
  allResults.slice(0, 5).forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.name}`);
    console.log(`      ${r.url}`);
    console.log(`      ${r.snippet}`);
  });

  // Extract with OpenAI
  console.log('\n  🤖 Extracting with OpenAI...');
  const result = await openaiExtract(address, listing.brokerage, allResults);

  console.log('\n  ─── RESULT ───────────────────────────────────────────');
  console.log(`  Listing Agent:    ${result.listing_agent || '❌ Not found'}`);
  console.log(`  Co-listing Agent: ${result.co_listing_agent || '—'}`);
  console.log(`  Brokerage:        ${result.brokerage || '—'}`);
  console.log(`  Phone:            ${result.agent_phone || '—'}`);
  console.log(`  Email:            ${result.agent_email || '—'}`);
  console.log(`  Source:           ${result.source_url || '—'}`);
  console.log(`  Confidence:       ${result.confidence}%`);
  console.log(`  Reason:           ${result.confidence_reason}`);

  const emoji = result.confidence >= 80 ? '✅' : result.confidence >= 50 ? '⚠️' : '❌';
  console.log(`\n  ${emoji} Confidence: ${result.confidence}%`);
}

async function main() {
  if (!BING_KEY || !OPENAI_KEY) {
    console.error('Missing BING_SEARCH_API_KEY or OPENAI_API_KEY env vars');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          Realtor Lookup Test — 4 Regions                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  for (const listing of TEST_LISTINGS) {
    await testListing(listing);
    // Pause between listings
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('  Test complete.');
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
