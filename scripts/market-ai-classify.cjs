#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const OpenAI = require('openai');
const Papa = require('papaparse');
const { classifyCommercialRelocation } = require('./commercial-market-lib.cjs');

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
const sqlJson = value => `'${JSON.stringify(value ?? null).replaceAll("'", "''")}'::jsonb`;
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
  const transitionDirections = ['move_out_likely', 'move_in_opportunity', 'unclear'];
  return {
    occupancy_state: state,
    classification_confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
    classification_evidence: Array.isArray(result.evidence) ? result.evidence.slice(0, 4).map(String) : [],
    classification_method: lane === 'commercial'
      ? 'openai-commercial-transition-v2'
      : usedPhotos ? 'openai-photo-description-v1' : 'openai-description-v1',
    furniture_visible: lane === 'commercial' ? result.furniture_visible === true : null,
    advertised_unit_visible: lane === 'commercial' ? result.advertised_unit_visible === true : null,
    transition_direction: lane === 'commercial' && transitionDirections.includes(result.transition_direction)
      ? result.transition_direction : 'unclear',
    transition_confidence: lane === 'commercial'
      ? Math.max(0, Math.min(1, Number(result.transition_confidence) || 0)) : 0,
    transition_cues: lane === 'commercial' && Array.isArray(result.transition_cues)
      ? result.transition_cues.slice(0, 4).map(String) : [],
    classified_at: new Date().toISOString(),
  };
}

async function classify(openai, row) {
  const imageUrls = photos(row);
  const states = lane === 'rental'
    ? 'furnished, partially_furnished, unfurnished, empty, construction, unknown'
    : 'occupied_furnished, occupied, vacant, shell, construction, unknown';
  const commercialInstruction = `For commercial listings, judge the ADVERTISED UNIT rather than neighbouring storefronts or the general building. Cars, exterior signage, or activity elsewhere in a plaza are not enough to prove the advertised unit is occupied. Furniture, desks, inventory, equipment, branding, or personal effects inside the advertised unit are strong occupancy evidence. Infer move_out_likely when an occupied/furnished advertised unit is being offered for lease or the text states availability, expiry, sublease, relocation, or vacancy timing. Infer move_in_opportunity for a vacant, shell, or construction unit being offered for lease. Do not claim certainty from generic exterior or map images.`;
  const schema = lane === 'commercial'
    ? '{"occupancy_state":"...","confidence":0.0,"furniture_visible":false,"advertised_unit_visible":false,"transition_direction":"move_out_likely|move_in_opportunity|unclear","transition_confidence":0.0,"transition_cues":["short cue"],"evidence":["short evidence"]}'
    : '{"occupancy_state":"...","confidence":0.0,"evidence":["short evidence"]}';
  const content = [{
    type: 'text',
    text: `Classify this ${lane} listing's PRESENT occupancy/furnishing state. Allowed states: ${states}. Distinguish furniture visible in listing photos from explicit rental inclusion: for rentals, use "furnished" only when photos and/or text support that the unit is offered furnished; use "unfurnished" when an occupied/staged-looking unit is not advertised furnished. ${lane === 'commercial' ? commercialInstruction : ''} Return strict JSON: ${schema}. Title: ${row.title || ''}\nUnit: ${row.unit_label || ''}\nTransaction: ${row.transaction_type || ''}\nDescription: ${(row.description || '').slice(0, 3500)}`,
  }, ...imageUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } }))];
  const response = await openai.chat.completions.create({
    model: process.env.MARKET_AI_MODEL || 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: lane === 'commercial' ? 300 : 180,
    messages: [{ role: 'user', content }],
  });
  return normalize(JSON.parse(response.choices[0]?.message?.content || '{}'), imageUrls.length > 0);
}

(async () => {
  if (!project || !token) throw new Error('Supabase credentials are required');
  const table = lane === 'rental' ? 'rental_source_records' : 'commercial_source_records';
  const cached = await query(`SELECT source, source_listing_id, occupancy_state, classification_confidence,
    classification_evidence, classification_method, classified_at${lane === 'commercial' ? ', furniture_visible, advertised_unit_visible, transition_direction, transition_confidence, transition_cues' : ''}
    FROM ${table} WHERE classified_at IS NOT NULL;`);
  const cache = new Map(cached.map(row => [key(row), row]));
  for (const row of records) Object.assign(row, cache.get(key(row)) || {});

  const justListed = new Set((lifecycle.events || []).filter(event => event.event_type === 'just_listed').map(key));
  const candidateRows = records.filter(row => lane === 'commercial'
    ? (row.listing_scope === 'unit' && row.transaction_type === 'lease' && row.classification_method !== 'openai-commercial-transition-v2')
      || justListed.has(key(row)) || !row.classified_at
    : justListed.has(key(row)) || !row.classified_at)
    .sort((a, b) => {
      if (lane === 'commercial') {
        const priority = row => Number(row.listing_scope === 'unit' && row.transaction_type === 'lease') * 10
          + Number(justListed.has(key(row))) * 3 + Number((row.photo_urls || []).length > 0);
        return priority(b) - priority(a);
      }
      return Number(justListed.has(key(b))) - Number(justListed.has(key(a)));
    });
  // Overlapping acquisition bounds may return the same source listing more
  // than once. Classify every unique candidate, with no volume ceiling.
  const candidates = [...new Map(candidateRows.map(row => [key(row), row])).values()];
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  let classified = 0;
  let failed = 0;
  let quotaBlocked = false;
  if (openai) {
    const concurrency = Math.max(1, Number(process.env.MARKET_AI_CONCURRENCY || 4));
    let cursor = 0;
    async function worker() {
      while (!quotaBlocked) {
        const index = cursor++;
        if (index >= candidates.length) return;
        const row = candidates[index];
      try {
        const result = await classify(openai, row);
        Object.assign(row, result);
        if (lane === 'commercial') Object.assign(row, classifyCommercialRelocation(row));
        await query(`UPDATE ${table} SET occupancy_state=${sqlText(result.occupancy_state)},
          classification_confidence=${result.classification_confidence},
          classification_evidence=ARRAY[${result.classification_evidence.map(sqlText).join(',')}]::text[],
          classification_method=${sqlText(result.classification_method)}, classified_at=now()
          ${lane === 'commercial' ? `, furniture_visible=${result.furniture_visible},
          advertised_unit_visible=${result.advertised_unit_visible},
          transition_direction=${sqlText(result.transition_direction)},
          transition_confidence=${result.transition_confidence},
          transition_cues=ARRAY[${result.transition_cues.map(sqlText).join(',')}]::text[],
          listing_scope=${sqlText(row.listing_scope)}, unit_label=${sqlText(row.unit_label)},
          current_occupant_name=${row.current_occupant_name ? sqlText(row.current_occupant_name) : 'NULL'},
          occupant_confidence=${Number(row.occupant_confidence) || 0},
          availability_date=${row.availability_date ? sqlText(row.availability_date) : 'NULL'},
          transition_evidence=${sqlJson(row.transition_evidence)},
          relocation_probability=${Number(row.relocation_probability) || 0},
          direct_relocation_candidate=${Boolean(row.direct_relocation_candidate)},
          relocation_reasons=${sqlJson(row.relocation_reasons)},
          relocation_candidate_type=${sqlText(row.relocation_candidate_type)},
          outreach_status=${sqlText(row.outreach_status)}` : ''}
          WHERE source=${sqlText(row.source)} AND source_listing_id=${sqlText(row.source_listing_id)};`);
        classified++;
      } catch (error) {
        failed++;
        console.error(`Classification failed for ${key(row)}: ${error.message}`);
        if (error.status === 429 && /quota|billing/i.test(error.message)) {
          quotaBlocked = true;
          console.error('OpenAI quota is unavailable; stopping this run without fabricating classifications.');
          break;
        }
      }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));
  }
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`);
  if (lane === 'commercial') {
    for (const row of records) Object.assign(row, classifyCommercialRelocation(row));
    const candidatesOut = records.filter(row => row.direct_relocation_candidate)
      .sort((a, b) => b.relocation_probability - a.relocation_probability);
    const reviewOut = records.filter(row => row.listing_scope === 'unit' && row.transaction_type === 'lease'
      && (row.relocation_probability >= 40 || row.transition_evidence.length || row.transition_direction !== 'unclear'))
      .sort((a, b) => b.relocation_probability - a.relocation_probability);
    const csvRows = reviewOut.map(row => ({
      source: row.source, source_listing_id: row.source_listing_id, listing_url: row.source_url,
      candidate_type: row.relocation_candidate_type, unit_label: row.unit_label,
      street_address: row.street_address, city: row.city, asset_type: row.asset_type,
      square_feet: row.space_size_sqft_min, occupancy_state: row.occupancy_state,
      furniture_visible: row.furniture_visible, advertised_unit_visible: row.advertised_unit_visible,
      ai_confidence: row.classification_confidence, transition_direction: row.transition_direction,
      transition_confidence: row.transition_confidence,
      ai_evidence: (row.classification_evidence || []).join(' | '),
      transition_cues: (row.transition_cues || []).join(' | '),
      availability_date: row.availability_date, relocation_probability: row.relocation_probability,
      outreach_status: row.outreach_status, observed_current_business: '',
      occupant_present_at_unit: '', transition_confirmed: '', unit_matches_listing: '', review_notes: '',
    }));
    fs.writeFileSync(path.join(runDir, 'relocation-review-queue.json'), `${JSON.stringify(reviewOut, null, 2)}\n`);
    fs.writeFileSync(path.join(runDir, 'relocation-candidates.json'), `${JSON.stringify(candidatesOut, null, 2)}\n`);
    fs.writeFileSync(path.join(runDir, 'relocation-review-queue.csv'), Papa.unparse(csvRows, { newline: '\n' }));
    fs.writeFileSync(path.join(runDir, 'relocation-candidates.csv'), Papa.unparse(
      csvRows.filter((_, index) => reviewOut[index].direct_relocation_candidate), { newline: '\n' }));
    const summaryPath = path.join(runDir, 'summary.json');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    summary.totals.direct_relocation_candidates = candidatesOut.length;
    summary.totals.market_intelligence_only = records.length - candidatesOut.length;
    summary.relocation_engine = {
      ...summary.relocation_engine,
      scoring_stage: 'post_ai_photo_and_description_v2',
      hard_gate: ['specific_unit', 'lease_listing', 'photo_or_text_transition_signal'],
      named_occupant_required: false,
      candidates: candidatesOut.length,
      outgoing_tenant_candidates: candidatesOut.filter(row => row.relocation_candidate_type === 'outgoing_tenant').length,
      incoming_tenant_opportunities: candidatesOut.filter(row => row.relocation_candidate_type === 'incoming_tenant_opportunity').length,
      human_review_queue: reviewOut.length,
    };
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`);
  }
  const counts = records.reduce((acc, row) => {
    const state = row.occupancy_state || 'unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  fs.writeFileSync(path.join(runDir, 'ai-classification-summary.json'),
    `${JSON.stringify({ model: process.env.MARKET_AI_MODEL || 'gpt-4o', candidates: candidates.length, classified, failed, quota_blocked: quotaBlocked, counts }, null, 2)}\n`);
  console.log(JSON.stringify({ lane, candidates: candidates.length, classified, failed, quota_blocked: quotaBlocked, counts }));
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
