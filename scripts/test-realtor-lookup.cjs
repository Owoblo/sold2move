#!/usr/bin/env node
/**
 * Test: Realtor Lookup via OpenAI web search + extraction
 *
 * Uses OpenAI's Responses API with web_search_preview tool so the model
 * searches the web itself — no separate Brave/Bing key needed.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/test-realtor-lookup.cjs
 *
 * Optional — also try Brave Search for comparison:
 *   OPENAI_API_KEY=sk-... BRAVE_SEARCH_API_KEY=BSA... node scripts/test-realtor-lookup.cjs
 */

const https = require('https');
const zlib = require('zlib');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY || '';

// ─── Test listings — one per region ──────────────────────────────────────────
const TEST_LISTINGS = [
  {
    region: 'Windsor / Essex',
    addressstreet: '1 Oak Ct',
    city: 'Essex',
    addressstate: 'ON',
    addresszipcode: 'N0R 1J0',
    brokerage: '',
  },
  {
    region: 'Chatham-Kent',
    addressstreet: '55 Murray St',
    city: 'Chatham',
    addressstate: 'ON',
    addresszipcode: '',
    brokerage: '',
  },
  {
    region: 'London / Middlesex',
    addressstreet: '234 Commissioners Rd W',
    city: 'London',
    addressstate: 'ON',
    addresszipcode: '',
    brokerage: '',
  },
  {
    region: 'Kitchener / Waterloo',
    addressstreet: '85 Bridgeport Rd E',
    city: 'Waterloo',
    addressstate: 'ON',
    addresszipcode: '',
    brokerage: '',
  },
];

// ─── Brave Search (optional, for comparison) ─────────────────────────────────
function braveSearch(query) {
  if (!BRAVE_KEY) return Promise.resolve([]);
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(query);
    const options = {
      hostname: 'api.search.brave.com',
      path: `/res/v1/web/search?q=${encoded}&count=10&country=ca&search_lang=en`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      const stream = res.headers['content-encoding'] === 'gzip'
        ? res.pipe(zlib.createGunzip()) : res;
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          resolve((parsed?.web?.results || []).map(r => ({
            name: r.title || '', url: r.url || '', snippet: r.description || '',
          })));
        } catch { resolve([]); }
      });
      stream.on('error', () => resolve([]));
    });
    req.on('error', () => resolve([]));
    req.setTimeout(15000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ─── OpenAI with web search (primary method) ─────────────────────────────────
function openaiWebSearch(address, brokerage) {
  const prompt = `Search the web for the listing agent/realtor for this Canadian property:

Address: ${address}
${brokerage ? `Known brokerage: ${brokerage}` : ''}

Search for this exact address on realtor.ca, brokerage websites, Zillow.ca, HouseSigma, Zolo, and any MLS listing sites.

Return ONLY valid JSON with no other text:
{
  "listing_agent": "full name or null",
  "co_listing_agent": "full name or null",
  "brokerage": "brokerage name or null",
  "agent_phone": "phone or null",
  "agent_email": "email or null",
  "source_url": "URL where you found this or null",
  "confidence": 0-100,
  "confidence_reason": "brief explanation of why you are or aren't confident"
}

Rules:
- Only return names explicitly listed as the listing agent for THIS exact property
- If you find the brokerage but not the specific agent, still return the brokerage
- ${brokerage ? `Cross-check: brokerage should match "${brokerage}" — lower confidence if it doesn't` : ''}
- If you cannot find reliable info, set confidence below 30
- NEVER guess or hallucinate — only report what you actually found on the web`;

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

          // The Responses API nests output differently
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
            console.log(`    API error: ${parsed.error.message || JSON.stringify(parsed.error)}`);
            resolve({ confidence: 0, confidence_reason: 'API error' });
            return;
          }

          // Extract JSON from response (may have markdown code blocks)
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            console.log(`    Raw response: ${text.slice(0, 300)}`);
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

// ─── OpenAI extraction from Brave results (secondary method) ─────────────────
function openaiExtractFromSnippets(address, brokerage, searchResults) {
  const snippets = searchResults
    .map((r, i) => `[${i + 1}] ${r.name}\n${r.url}\n${r.snippet}`)
    .join('\n\n');

  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Extract listing agent info from these search results for: ${address}
${brokerage ? `Known brokerage: ${brokerage}` : ''}

${snippets}

Return ONLY valid JSON:
{"listing_agent":"name or null","co_listing_agent":"name or null","brokerage":"name or null","agent_phone":"phone or null","agent_email":"email or null","source_url":"url or null","confidence":0-100,"confidence_reason":"reason"}

Only extract names explicitly shown as the listing agent for this exact address. Never guess.`
    }],
    temperature: 0,
    max_tokens: 400,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.message?.content || '{}';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          resolve(jsonMatch ? JSON.parse(jsonMatch[0]) : { confidence: 0 });
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

  // ── Method 1: OpenAI with built-in web search ──
  console.log('\n  METHOD 1: OpenAI + Web Search');
  console.log('  Searching and extracting...');
  const result1 = await openaiWebSearch(address, listing.brokerage);

  console.log('  ─── RESULT ───────────────────────────────────────────');
  console.log(`  Listing Agent:    ${result1.listing_agent || '—'}`);
  console.log(`  Co-listing Agent: ${result1.co_listing_agent || '—'}`);
  console.log(`  Brokerage:        ${result1.brokerage || '—'}`);
  console.log(`  Phone:            ${result1.agent_phone || '—'}`);
  console.log(`  Email:            ${result1.agent_email || '—'}`);
  console.log(`  Source:           ${result1.source_url || '—'}`);
  console.log(`  Confidence:       ${result1.confidence}%`);
  console.log(`  Reason:           ${result1.confidence_reason}`);
  const e1 = result1.confidence >= 80 ? '✅' : result1.confidence >= 50 ? '⚠️' : '❌';
  console.log(`  ${e1} Confidence: ${result1.confidence}%`);

  // ── Method 2: Brave Search + OpenAI extraction (if Brave key provided) ──
  if (BRAVE_KEY) {
    console.log('\n  METHOD 2: Brave Search + OpenAI Extraction');
    const query = `"${listing.addressstreet}" "${listing.city}" Ontario listing agent realtor`;
    console.log(`  🔍 Searching: ${query}`);
    const braveResults = await braveSearch(query);
    console.log(`     → ${braveResults.length} results`);

    if (braveResults.length > 0) {
      braveResults.slice(0, 3).forEach((r, i) => {
        console.log(`  [${i + 1}] ${r.name}`);
        console.log(`      ${r.snippet.slice(0, 120)}`);
      });

      const result2 = await openaiExtractFromSnippets(address, listing.brokerage, braveResults);
      console.log('  ─── RESULT ───────────────────────────────────────────');
      console.log(`  Listing Agent:    ${result2.listing_agent || '—'}`);
      console.log(`  Brokerage:        ${result2.brokerage || '—'}`);
      console.log(`  Confidence:       ${result2.confidence}%`);
      console.log(`  Reason:           ${result2.confidence_reason}`);
    } else {
      console.log('  No Brave results found');
    }
  }
}

async function main() {
  if (!OPENAI_KEY) {
    console.error('Missing OPENAI_API_KEY env var');
    console.error('Usage: OPENAI_API_KEY=sk-... node scripts/test-realtor-lookup.cjs');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          Realtor Lookup Test — 4 Regions                ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Method 1: OpenAI with web_search_preview (primary)    ║');
  if (BRAVE_KEY) {
    console.log('║  Method 2: Brave Search + OpenAI extraction (compare)  ║');
  }
  console.log('╚══════════════════════════════════════════════════════════╝');

  for (const listing of TEST_LISTINGS) {
    await testListing(listing);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('  Test complete.');
  console.log('  If results are accurate, we build this into Step 7.');
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
