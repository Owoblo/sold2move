#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { normalize, recoverLatestSuccessfulDataset } = require('./gta-market-census.cjs');

const OUT_DIR = path.join(__dirname, '.gta-full-vision');
const JOB_KEY = process.env.GTA_VISION_JOB_KEY || 'gta-full-vision-20260818-v1';
const MODEL = process.env.GTA_VISION_MODEL || 'gpt-4o';
const MAX_WAIT_MINUTES = Number(process.env.GTA_VISION_MAX_WAIT_MINUTES || 330);
const BATCH_REQUEST_LIMIT = Number(process.env.GTA_VISION_BATCH_REQUEST_LIMIT || 4500);

async function datasetForApifyRun(token, runId) {
  const runResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`);
  if (!runResponse.ok) throw new Error(`Could not read Apify run ${runId} (${runResponse.status})`);
  const datasetId = (await runResponse.json())?.data?.defaultDatasetId;
  if (!datasetId) throw new Error(`Apify run ${runId} has no dataset`);
  const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&format=json`);
  if (!datasetResponse.ok) throw new Error(`Could not download Apify dataset ${datasetId} (${datasetResponse.status})`);
  return datasetResponse.json();
}

const SYSTEM_PROMPT = `You classify Canadian real-estate listings for moving-company homeowner outreach. Be conservative and use only supplied metadata and photos.
Return JSON only with:
- market_segment: owner_occupied, investor_flip, student_housing, rental, new_construction, land_lot, unknown
- listing_categories: array containing any of ordinary_resale, investor_flip, student_housing, rental, new_construction, land_lot
- occupancy_state: furnished, partially_furnished, empty, construction, not_applicable, unknown
- outreach_target: homeowner, realtor, builder_developer, landlord_property_manager, leasing_agent, unknown
- property_signals: short evidence strings
- confidence: number 0 through 1
- reasons: short evidence strings
Do not infer a flip merely from staging or renovation. Do not infer owner occupancy as a legal fact. Ordinary resale with no specialist evidence may be owner_occupied. Rental requires lease/rental evidence. Classify visible furniture conservatively; staged but furnished rooms still count as furnished for physical-mail qualification.`;

function photosOf(item) {
  const urls = [];
  const add = value => {
    const url = typeof value === 'string' ? value : value?.url || value?.href || value?.src;
    if (url && !/maps\.googleapis|streetview/i.test(url)) urls.push(url);
  };
  for (const field of ['listingPhotos', 'responsivePhotos', 'originalPhotos', 'photos', 'images', 'big']) {
    if (!Array.isArray(item[field])) continue;
    for (const photo of item[field]) {
      if (photo?.mixedSources?.jpeg?.length) {
        const best = [...photo.mixedSources.jpeg].sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        add(best);
      } else add(photo);
    }
    if (urls.length) break;
  }
  if (!urls.length && Array.isArray(item.carouselPhotosComposable?.photoData)) {
    const base = item.carouselPhotosComposable.baseUrl;
    for (const photo of item.carouselPhotosComposable.photoData) {
      if (base && photo.photoKey) add(base.replace('{photoKey}', photo.photoKey));
    }
  }
  if (!urls.length) add(item.mainImage || item.imgSrc || item.thumbnail);
  return [...new Set(urls)].slice(0, 6);
}

function validPostal(value) {
  return /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(String(value || ''));
}

function deterministicReason(row, photoUrls) {
  if (!row.municipality || row.state !== 'ON') return 'outside_gta';
  if (!(row.price >= 300000 && row.price <= 100000000)) return 'below_or_invalid_price';
  if (['LOT', 'LAND'].includes(String(row.property_type || '').toUpperCase())) return 'lot_or_land';
  if (!/^\d/.test(String(row.street || '').trim())) return 'no_street_number';
  if (!validPostal(row.postal_code)) return 'invalid_postal';
  if (photoUrls.length < 2) return 'insufficient_photos';
  return null;
}

function requestFor(row, photos) {
  return {
    custom_id: `zpid-${row.zpid}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: MODEL,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                property_type: row.property_type,
                price_cad: row.price,
                beds: row.beds,
                baths: row.baths,
                square_feet: row.area,
                municipality: row.municipality,
              }),
            },
            ...photos.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
          ],
        },
      ],
    },
  };
}

function safeClassification(line) {
  try {
    if (line.error) return { error: JSON.stringify(line.error) };
    const content = line.response?.body?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(String(content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    return { classification: parsed };
  } catch (error) {
    return { error: error.message };
  }
}

function jsonLines(text) {
  return String(text || '').split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
}

function counts(rows, getter) {
  const result = {};
  for (const row of rows) {
    const value = getter(row) || 'unknown';
    result[value] = (result[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1]));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.APIFY_TOKEN) throw new Error('APIFY_TOKEN is required');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let raw;
  let baselineIds = null;
  if (process.env.GTA_VISION_CURRENT_APIFY_RUN && process.env.GTA_VISION_BASELINE_APIFY_RUN) {
    console.log('Loading current and baseline GTA censuses for an incremental vision scan...');
    const [current, baseline] = await Promise.all([
      datasetForApifyRun(process.env.APIFY_TOKEN, process.env.GTA_VISION_CURRENT_APIFY_RUN),
      datasetForApifyRun(process.env.APIFY_TOKEN, process.env.GTA_VISION_BASELINE_APIFY_RUN),
    ]);
    raw = current;
    baselineIds = new Set(baseline.map(item => String(item.zpid || item.id || '')).filter(Boolean));
  } else {
    console.log('Recovering the completed full GTA census...');
    raw = await recoverLatestSuccessfulDataset(process.env.APIFY_TOKEN);
  }
  const unique = [...new Map(raw.map(item => [String(item.zpid || item.id), item])).values()]
    .filter(item => !baselineIds || !baselineIds.has(String(item.zpid || item.id)));
  const rejected = [];
  const manifest = [];
  const requests = [];
  for (const item of unique) {
    const row = normalize(item);
    const photos = photosOf(item);
    const reason = deterministicReason(row, photos);
    if (reason) {
      rejected.push({ zpid: row.zpid, municipality: row.municipality, reason });
      continue;
    }
    manifest.push({ ...row, photo_count_scanned: photos.length });
    requests.push(requestFor(row, photos));
  }

  const requestsPath = path.join(OUT_DIR, 'requests.jsonl');
  fs.writeFileSync(requestsPath, requests.map(row => JSON.stringify(row)).join('\n') + '\n');
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Raw unique: ${unique.length}; submitted for vision: ${requests.length}; deterministic rejects: ${rejected.length}`);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const deadline = Date.now() + MAX_WAIT_MINUTES * 60_000;
  const chunks = [];
  for (let i = 0; i < requests.length; i += BATCH_REQUEST_LIMIT) chunks.push(requests.slice(i, i + BATCH_REQUEST_LIMIT));
  const batchStates = [];
  const outputParts = [];
  const errorParts = [];
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const partKey = `${JOB_KEY}-part-${index + 1}-of-${chunks.length}`;
    const recent = await openai.batches.list({ limit: 100 });
    let batch = recent.data.find(candidate => candidate.metadata?.job_key === partKey &&
      !['failed', 'expired', 'cancelled'].includes(candidate.status));
    if (!batch) {
      const partPath = path.join(OUT_DIR, `requests-part-${index + 1}.jsonl`);
      fs.writeFileSync(partPath, chunk.map(row => JSON.stringify(row)).join('\n') + '\n');
      console.log(`Uploading batch part ${index + 1}/${chunks.length} (${chunk.length} requests)...`);
      const inputFile = await openai.files.create({ file: fs.createReadStream(partPath), purpose: 'batch' });
      batch = await openai.batches.create({
        input_file_id: inputFile.id,
        endpoint: '/v1/chat/completions',
        completion_window: '24h',
        metadata: { job_key: partKey, market: 'gta-26', model: MODEL },
      });
      console.log(`Created batch part ${index + 1}: ${batch.id}`);
    } else {
      console.log(`Resuming batch part ${index + 1}: ${batch.id} (${batch.status})`);
    }
    while (!['completed', 'failed', 'expired', 'cancelled'].includes(batch.status) && Date.now() < deadline) {
      await sleep(60_000);
      batch = await openai.batches.retrieve(batch.id);
      console.log(`Part ${index + 1}/${chunks.length} ${batch.status}: ${batch.request_counts?.completed || 0}/${batch.request_counts?.total || chunk.length}, failed ${batch.request_counts?.failed || 0}`);
    }
    batchStates.push(batch);
    fs.writeFileSync(path.join(OUT_DIR, 'batch-state.json'), JSON.stringify(batchStates, null, 2));
    if (batch.status !== 'completed') {
      console.log(`Batch part ${index + 1} remains ${batch.status}; rerun later to resume collection.`);
      return;
    }
    const response = await openai.files.content(batch.output_file_id);
    outputParts.push(await response.text());
    if (batch.error_file_id) {
      const errorResponse = await openai.files.content(batch.error_file_id);
      errorParts.push(await errorResponse.text());
    }
  }
  const outputText = outputParts.join('\n');
  const originalErrors = errorParts.join('\n');
  const outputById = new Map(jsonLines(outputText).map(line => [line.custom_id, line]));
  const retryIds = new Set(jsonLines(originalErrors).map(line => line.custom_id));
  for (const [customId, line] of outputById) {
    if (!safeClassification(line).classification) retryIds.add(customId);
  }

  let finalErrorLines = [];
  if (retryIds.size) {
    const retryKey = `${JOB_KEY}-retry-unresolved-v1`;
    const badImageById = new Map();
    for (const line of jsonLines(originalErrors)) {
      const message = line.response?.body?.error?.message || line.error?.message || '';
      const match = message.match(/https?:\/\/[^\s]+/);
      if (match) badImageById.set(line.custom_id, match[0].replace(/[.]+$/, ''));
    }
    const retryRequests = requests.filter(request => retryIds.has(request.custom_id)).map(request => {
      const copy = JSON.parse(JSON.stringify(request));
      copy.body.max_tokens = 500;
      const badUrl = badImageById.get(copy.custom_id);
      if (badUrl) {
        copy.body.messages[1].content = copy.body.messages[1].content.filter(part =>
          part.type !== 'image_url' || part.image_url.url !== badUrl);
      }
      return copy;
    });
    console.log(`Retrying ${retryRequests.length} unresolved unique requests...`);
    const recent = await openai.batches.list({ limit: 100 });
    let retryBatch = recent.data.find(candidate => candidate.metadata?.job_key === retryKey &&
      !['failed', 'expired', 'cancelled'].includes(candidate.status));
    if (!retryBatch) {
      const retryPath = path.join(OUT_DIR, 'requests-retry.jsonl');
      fs.writeFileSync(retryPath, retryRequests.map(row => JSON.stringify(row)).join('\n') + '\n');
      const retryFile = await openai.files.create({ file: fs.createReadStream(retryPath), purpose: 'batch' });
      retryBatch = await openai.batches.create({
        input_file_id: retryFile.id,
        endpoint: '/v1/chat/completions',
        completion_window: '24h',
        metadata: { job_key: retryKey, market: 'gta-26', model: MODEL },
      });
      console.log(`Created unresolved retry batch: ${retryBatch.id}`);
    } else {
      console.log(`Resuming unresolved retry batch: ${retryBatch.id} (${retryBatch.status})`);
    }
    while (!['completed', 'failed', 'expired', 'cancelled'].includes(retryBatch.status) && Date.now() < deadline) {
      await sleep(60_000);
      retryBatch = await openai.batches.retrieve(retryBatch.id);
      console.log(`Retry ${retryBatch.status}: ${retryBatch.request_counts?.completed || 0}/${retryBatch.request_counts?.total || retryRequests.length}, failed ${retryBatch.request_counts?.failed || 0}`);
    }
    if (retryBatch.status !== 'completed') {
      console.log(`Retry batch remains ${retryBatch.status}; rerun later to resume collection.`);
      return;
    }
    batchStates.push(retryBatch);
    const retryResponse = await openai.files.content(retryBatch.output_file_id);
    for (const line of jsonLines(await retryResponse.text())) outputById.set(line.custom_id, line);
    if (retryBatch.error_file_id) {
      const retryErrorResponse = await openai.files.content(retryBatch.error_file_id);
      finalErrorLines = jsonLines(await retryErrorResponse.text());
    }
  }

  const dedupedOutputText = [...outputById.values()].map(line => JSON.stringify(line)).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT_DIR, 'responses.jsonl'), dedupedOutputText);
  const errorText = finalErrorLines.map(line => JSON.stringify(line)).join('\n');
  if (errorText.trim()) fs.writeFileSync(path.join(OUT_DIR, 'errors.jsonl'), errorText + '\n');

  const manifestById = new Map(manifest.map(row => [`zpid-${row.zpid}`, row]));
  const classified = dedupedOutputText.trim().split('\n').filter(Boolean).map(text => {
    const line = JSON.parse(text);
    return { ...manifestById.get(line.custom_id), custom_id: line.custom_id, ...safeClassification(line) };
  });
  const successful = classified.filter(row => row.classification);
  for (const row of successful) {
    const result = row.classification;
    row.legacy_pipeline_qualified = ['furnished', 'partially_furnished'].includes(result.occupancy_state);
    row.strict_homeowner_qualified = row.legacy_pipeline_qualified &&
      result.outreach_target === 'homeowner' &&
      ['owner_occupied', 'investor_flip'].includes(result.market_segment);
  }

  const municipalities = [...new Set(manifest.map(row => row.municipality))].sort().map(municipality => {
    const rows = successful.filter(row => row.municipality === municipality);
    return {
      municipality,
      vision_scanned: rows.length,
      legacy_pipeline_qualified: rows.filter(row => row.legacy_pipeline_qualified).length,
      strict_homeowner_qualified: rows.filter(row => row.strict_homeowner_qualified).length,
      legacy_yield_pct: rows.length ? Math.round(1000 * rows.filter(row => row.legacy_pipeline_qualified).length / rows.length) / 10 : 0,
      strict_yield_pct: rows.length ? Math.round(1000 * rows.filter(row => row.strict_homeowner_qualified).length / rows.length) / 10 : 0,
    };
  });
  const report = {
    generated_at: new Date().toISOString(),
    batch_ids: batchStates.map(batch => batch.id),
    model: MODEL,
    interpretation: 'Hypothetical first-day just-listed qualification of the current active baseline; not an average daily arrival count.',
    raw_unique: unique.length,
    deterministic_rejected: rejected.length,
    deterministic_rejected_by_reason: counts(rejected, row => row.reason),
    vision_submitted: manifest.length,
    vision_completed: successful.length,
    vision_failed: classified.length - successful.length + (errorText.trim() ? errorText.trim().split('\n').length : 0),
    legacy_pipeline_qualified: successful.filter(row => row.legacy_pipeline_qualified).length,
    strict_homeowner_qualified: successful.filter(row => row.strict_homeowner_qualified).length,
    market_segments: counts(successful, row => row.classification.market_segment),
    occupancy_states: counts(successful, row => row.classification.occupancy_state),
    outreach_targets: counts(successful, row => row.classification.outreach_target),
    municipalities,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'classified.json'), JSON.stringify(classified, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'deterministic-rejections.json'), JSON.stringify(rejected, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'failure.json'), JSON.stringify({ at: new Date().toISOString(), error: error.stack || error.message }, null, 2));
  console.error(error.stack || error.message);
  process.exit(1);
});
