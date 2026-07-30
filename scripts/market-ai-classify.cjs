#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const OpenAI = require('openai');

const lane = process.argv[2];
const runDir = process.argv[3];
if (!['rental', 'commercial'].includes(lane) || !runDir) {
  throw new Error('Usage: market-ai-classify.cjs rental|commercial RUN_DIR');
}
const file = lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json';
const filePath = path.join(runDir, file);
const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json'), 'utf8'));
const project = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

function query(sql) {
  const body = JSON.stringify({ query: sql });
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.supabase.com', path: `/v1/projects/${project}/database/query`, method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, response => {
      let result = '';
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => response.statusCode >= 200 && response.statusCode < 300
        ? resolve(result ? JSON.parse(result) : []) : reject(new Error(`Supabase ${response.statusCode}: ${result.slice(0, 500)}`)));
    });
    request.on('error', reject);
    request.end(body);
  });
}
const sqlText = value => `'${String(value ?? '').replaceAll("'", "''")}'`;
const key = row => `${row.source}|${row.source_listing_id}`;

function photos(row) {
  const values = Array.isArray(row.photo_urls) ? row.photo_urls : [];
  const clean = values.map(value => typeof value === 'string' ? value : value?.url || value?.src)
    .filter(value => value && !/maps\.googleapis|streetview/i.test(value));
  const picks = [0, 1, 4, 5, 7, 9].map(index => clean[index]).filter(Boolean);
  return [...new Set(picks)].slice(0, 6);
}

function normalize(result, usedPhotos) {
  const allowed = lane === 'rental'
    ? ['furnished', 'partially_furnished', 'unfurnished', 'empty', 'construction', 'unknown']
    : ['occupied_furnished', 'occupied', 'vacant', 'shell', 'construction', 'unknown'];
  const state = allowed.includes(result.occupancy_state) ? result.occupancy_state : 'unknown';
  return {
    occupancy_state: state,
    classification_confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
    classification_evidence: Array.isArray(result.evidence) ? result.evidence.slice(0, 4).map(String) : [],
    classification_method: usedPhotos ? 'openai-photo-description-v1' : 'openai-description-v1',
    classified_at: new Date().toISOString(),
  };
}

async function classify(openai, row) {
  const imageUrls = photos(row);
  const states = lane === 'rental'
    ? 'furnished, partially_furnished, unfurnished, empty, construction, unknown'
    : 'occupied_furnished, occupied, vacant, shell, construction, unknown';
  const content = [{
    type: 'text',
    text: `Classify this ${lane} listing's PRESENT occupancy/furnishing state. Allowed states: ${states}. Distinguish furniture visible in listing photos from explicit rental inclusion: for rentals, use "furnished" only when photos and/or text support that the unit is offered furnished; use "unfurnished" when an occupied/staged-looking unit is not advertised furnished. Return strict JSON: {"occupancy_state":"...","confidence":0.0,"evidence":["short evidence"]}. Title: ${row.title || ''}\nDescription: ${(row.description || '').slice(0, 3500)}`,
  }, ...imageUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } }))];
  const response = await openai.chat.completions.create({
    model: process.env.MARKET_AI_MODEL || 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 180,
    messages: [{ role: 'user', content }],
  });
  return normalize(JSON.parse(response.choices[0]?.message?.content || '{}'), imageUrls.length > 0);
}

(async () => {
  if (!project || !token) throw new Error('Supabase credentials are required');
  const table = lane === 'rental' ? 'rental_source_records' : 'commercial_source_records';
  const cached = await query(`SELECT source, source_listing_id, occupancy_state, classification_confidence,
    classification_evidence, classification_method, classified_at FROM ${table} WHERE classified_at IS NOT NULL;`);
  const cache = new Map(cached.map(row => [key(row), row]));
  for (const row of records) Object.assign(row, cache.get(key(row)) || {});

  const justListed = new Set((lifecycle.events || []).filter(event => event.event_type === 'just_listed').map(key));
  const limit = Number(process.env.MARKET_AI_BACKFILL_LIMIT || 150);
  const candidates = records.filter(row => justListed.has(key(row)) || !row.classified_at)
    .sort((a, b) => Number(justListed.has(key(b))) - Number(justListed.has(key(a)))).slice(0, limit);
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  let classified = 0;
  let failed = 0;
  if (openai) {
    for (const row of candidates) {
      try {
        const result = await classify(openai, row);
        Object.assign(row, result);
        await query(`UPDATE ${table} SET occupancy_state=${sqlText(result.occupancy_state)},
          classification_confidence=${result.classification_confidence},
          classification_evidence=ARRAY[${result.classification_evidence.map(sqlText).join(',')}],
          classification_method=${sqlText(result.classification_method)}, classified_at=now()
          WHERE source=${sqlText(row.source)} AND source_listing_id=${sqlText(row.source_listing_id)};`);
        classified++;
      } catch (error) {
        failed++;
        console.error(`Classification failed for ${key(row)}: ${error.message}`);
      }
    }
  }
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`);
  const counts = records.reduce((acc, row) => {
    const state = row.occupancy_state || 'unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  fs.writeFileSync(path.join(runDir, 'ai-classification-summary.json'),
    `${JSON.stringify({ model: process.env.MARKET_AI_MODEL || 'gpt-4o', candidates: candidates.length, classified, failed, counts }, null, 2)}\n`);
  console.log(JSON.stringify({ lane, candidates: candidates.length, classified, failed, counts }));
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
