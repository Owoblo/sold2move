const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { unitIdentity, normalizeZillow, normalizeRentSeeker, classifyDescription } = require('./rental-market-lib.cjs');
const { fetchRentSeeker, run: acquire } = require('./rental-pipeline.cjs');
const { evaluateRental, buildRentalQueue, reusableClassification, classificationFingerprint, CLASSIFIER_VERSION } = require('./rental-outreach-lib.cjs');
const { classify, requestFor } = require('./rental-classify.cjs');
const { build } = require('./rental-postcards.cjs');
const { renderRental, validateManifest } = require('./rental-artwork.cjs');
const { diffInventory } = require('./market-lifecycle-lib.cjs');
(async () => {
  assert.equal(unitIdentity('123 Main St Unit 4').unit_label, '4');
  assert.equal(unitIdentity('4-123 Main St').mailing_street, '123 Main St Unit 4');
  const source = { zpid: '1', streetAddress: '123 Main St Unit 4', city: 'Windsor', state: 'ON', zipcode: 'N9A 1A1', homeType: 'APARTMENT', description: 'Current tenant lives here. Unfurnished lease.', photos: ['https://example.com/interior.jpg'] };
  const row = { ...normalizeZillow(source), acquisition_scope: 'windsor', acquisition_fresh: true, observed_at: new Date().toISOString(),
    current_occupancy: 'occupied', occupancy_state: 'unfurnished', classification_confidence: 0.94, classification_method: CLASSIFIER_VERSION };
  assert.equal(row.unit_label, '4');
  assert(evaluateRental(row, 'just_listed').postcard_eligible);
  assert(!evaluateRental({ ...row, current_occupancy: 'vacant', occupancy_state: 'furnished' }, 'just_listed').postcard_eligible);
  for (const change of [{ unit_label: null }, { classification_confidence: 0.79 }, { acquisition_fresh: false }, { postal_code: '' }, { current_occupancy: 'staged' }, { classification_stale: true }, { description: 'Room for rent with a shared kitchen' }]) {
    assert(!evaluateRental({ ...row, ...change }, 'just_listed').postcard_eligible);
  }
  assert(!evaluateRental(row, 'leased_or_withdrawn').postcard_eligible);
  assert(!classifyDescription('Not furnished.').categories.includes('furnished'));
  const rentseeker = normalizeRentSeeker({ objectID: '2', name: '20 Test St', url: 'https://www.rentseeker.ca/rent/apartment/ontario/chatham-kent/194/test' }, 'Windsor');
  assert.equal(rentseeker.city, 'chatham kent');
  assert.equal(rentseeker.province, 'ON');
  assert.equal(normalizeRentSeeker({ name: 'Unknown' }, 'Windsor').province, '');
  let pages = 0;
  const paged = await fetchRentSeeker({}, async (url, headers, body) => ({ hits: [{ objectID: String(body.page) }], nbPages: 2, nbHits: 2, ...(pages++ < 10 ? {} : {}) }));
  assert.equal(paged.length, 2);
  assert.equal(pages, 2);
  await assert.rejects(fetchRentSeeker({}, async () => ({ hits: [], nbPages: 1, nbHits: 20 })), /truncated/);
  const records = [row, { ...row, source_listing_id: '2', unit_label: '5' }, { ...row, source: 'other', source_listing_id: '3' }];
  const events = records.map(r => ({ source: r.source, source_listing_id: r.source_listing_id, event_type: 'just_listed' }));
  const queue = buildRentalQueue(records, events);
  assert.equal(queue.filter(r => r.postcard_eligible).length, 2);
  assert.equal(buildRentalQueue(records, events, [{ mailing_key: queue[0].mailing_key }]).filter(r => r.postcard_eligible).length, 1);
  const cached = { ...row, classified_at: new Date().toISOString(), classification_fingerprint: classificationFingerprint(row) };
  assert(reusableClassification(row, cached));
  assert(!reusableClassification({ ...row, description: 'Now vacant' }, cached));
  assert(!reusableClassification(row, { ...cached, classified_at: '2020-01-01' }));
  assert.match(requestFor(row).messages[0].content[0].text, /unfurnished lease CAN/);
  assert.equal(diffInventory({ lane: 'rental', current: [row], previous: [{ ...row, active: false }], successfulScopes: [] }).events[0].event_type, 'relisted');
  const acquisitionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rental-acquisition-test-'));
  const costs = require('./postcard-cost-report.cjs');
  const oldTrack = costs.startTracking, oldToken = process.env.APIFY_TOKEN, oldLog = console.log;
  costs.startTracking = () => {};
  process.env.APIFY_TOKEN = 'test-only';
  console.log = () => {};
  try {
    const summary = await acquire({ outputDir: acquisitionDir, province: 'ON', enrichments: [{ source: 'zillow', datasetId: 'old', observedAt: '2020-01-01' }],
      datasets: [{ source: 'zillow', region: 'windsor', city: 'Windsor', bounds: { south: 42, north: 43, west: -84, east: -82 } },
        { source: 'rentseeker', region: 'sarnia', city: 'Sarnia', bounds: {} }] },
      { runSearchScraper: async () => [source, source], fetchRentSeeker: async () => { throw new Error('source offline'); },
        fetchDataset: async () => { throw new Error('Stale enrichment must not be fetched'); } });
    assert.equal(summary.totals.accepted_source_records, 1);
    assert.equal(summary.acquisitions[1].complete, false);
    assert.equal(summary.acquisitions[1].fresh, false);
  } finally { costs.startTracking = oldTrack; console.log = oldLog; if (oldToken === undefined) delete process.env.APIFY_TOKEN; else process.env.APIFY_TOKEN = oldToken; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rental-campaign-test-'));
  fs.writeFileSync(path.join(tmp, 'normalized-source-records.json'), JSON.stringify(records));
  fs.writeFileSync(path.join(tmp, 'lifecycle-summary.json'), JSON.stringify({ events }));
  const queries = [];
  await classify(tmp, { db: async sql => { queries.push(sql); return []; }, client: { chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify({ current_occupancy: 'occupied', offered_furnishing: 'unfurnished', furniture_visible: true, confidence: 0.94, evidence: ['Explicit current tenant'] }) } }] }) } } } });
  assert(queries.some(q => q.startsWith('UPDATE rental_source_records')));
  let reserved;
  const db = async sql => { if (sql.startsWith('BEGIN;')) reserved = sql; return []; };
  // Prove saved rendering cannot call the network or modify database state.
  const https = require('https'), http = require('http');
  const original = [https.request, https.get, http.request, http.get, global.fetch];
  const deny = () => { throw new Error('Unexpected network access during saved artwork rendering'); };
  https.request = https.get = http.request = http.get = global.fetch = deny;
  try {
    const manifest = await build(tmp, { db });
    assert.equal(manifest.recipients.length, 2);
    assert(reserved.includes('INSERT INTO rental_postcard_recipients'));
    const reprint = path.join(tmp, 'replacement');
    await renderRental(manifest, reprint);
    assert.deepEqual(fs.readFileSync(path.join(tmp, 'postcards', 'rental-recipients.csv')), fs.readFileSync(path.join(reprint, 'rental-recipients.csv')));
    const { PDFDocument } = require('pdf-lib');
    const pdf = await PDFDocument.load(fs.readFileSync(path.join(reprint, fs.readdirSync(reprint).find(f => f.endsWith('.pdf')))));
    assert.equal(pdf.getPageCount(), 2);
    assert.equal(pdf.getPage(0).getWidth(), 522);
    assert.throws(() => validateManifest({ ...manifest, recipients: [] }), /changed/);
    await assert.rejects(build(tmp, { db: async () => { throw new Error('History unavailable'); } }), /History unavailable/);
  } finally { [https.request, https.get, http.request, http.get, global.fetch] = original; }
  console.log(`Rental campaign tests passed. Fixture artwork: ${tmp}/postcards`);
})().catch(e => { console.error(e); process.exitCode = 1; });
