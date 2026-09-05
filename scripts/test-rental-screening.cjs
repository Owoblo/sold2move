const assert = require('assert/strict'), fs = require('fs'), path = require('path'), os = require('os');
const { targets, roundRobin, reusableForObservation } = require('./rental-screening-lib.cjs');
const { CLASSIFIER_VERSION, classificationFingerprint } = require('./rental-outreach-lib.cjs');
const { classify, assess } = require('./rental-classify.cjs');
(async () => {
  const areas = ['windsor','chatham','sarnia','london','woodstock','wkg'];
  const rows = areas.flatMap((region, n) => Array.from({ length: n === 0 ? 161 : 3 }, (_, i) => ({
    source: 'zillow', source_listing_id: `${region}-${i}`, acquisition_scope: region, acquisition_fresh: true,
    unit_label: '1', street_address: `${i+1} ${region} Street`, description: 'Current tenant occupied.',
    observed_at: new Date(Date.now()-10000).toISOString(), photo_urls: [],
  })));
  const events = rows.map(r => ({ ...r, event_type: 'relisted' }));
  assert.equal(targets(rows, events).length, 176);
  assert.deepEqual(roundRobin(rows).slice(0,6).map(r=>r.acquisition_scope), areas);
  const cached = { ...rows[0], classification_method: CLASSIFIER_VERSION, classified_at: new Date(Date.now()-1000).toISOString(), classification_fingerprint: classificationFingerprint(rows[0]), current_occupancy: 'vacant', classification_confidence: 0.95 };
  assert(reusableForObservation(rows[0], cached));
  assert(!reusableForObservation(rows[0], { ...cached, classified_at: '2020-01-01' }));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'rental-all-regions-'));
  fs.writeFileSync(path.join(dir,'normalized-source-records.json'),JSON.stringify(rows));
  fs.writeFileSync(path.join(dir,'lifecycle-summary.json'),JSON.stringify({events}));
  let calls = 0;
  const db = async sql => sql.startsWith('SELECT') ? [cached] : [];
  const client = { chat: { completions: { create: async () => { calls++; return { choices: [{ message: { content: JSON.stringify({current_occupancy:'vacant',confidence:0.95,evidence:['Empty interior']}) } }] }; } } } };
  await classify(dir,{db,client});
  assert.equal(calls,175); // Includes every region beyond the old cutoff and reuses the completed reappearance.
  const summary = JSON.parse(fs.readFileSync(path.join(dir,'ai-classification-summary.json')));
  assert(summary.screening_complete);
  for(const region of areas) { assert.equal(summary.regions[region].pending,0); assert(summary.regions[region].classified>0); }
  await classify(dir,{db:async sql=>sql.startsWith('SELECT')?JSON.parse(fs.readFileSync(path.join(dir,'normalized-source-records.json'))):[],client});
  assert.equal(calls,175); // Retry adds no AI calls.
  let attempts = 0;
  const fallback = await assess({ ...rows[0], photo_urls: ['https://example.com/broken.jpg'] }, { chat: { completions: { create: async request => {
    if (!attempts++) throw Object.assign(new Error('Invalid image'), { status: 400 });
    assert.equal(request.messages[0].content.length, 1);
    assert.match(request.messages[0].content[0].text, /Do not claim visual evidence/);
    return { choices: [{ message: { content: '{"current_occupancy":"unknown","confidence":0}' } }] };
  } } } });
  assert.equal(fallback.current_occupancy, 'unknown');
  assert(fallback.classification_evidence.some(e => e.includes('Photos unavailable')));
  attempts = 0;
  await assess(rows[0], { chat: { completions: { create: async () => ({ choices: [{ message: { content: attempts++ ? '{"current_occupancy":"unknown"}' : '{' } }] }) } } });
  assert.equal(attempts, 2);
  console.log('All-region screening, round-robin ordering and completed-work reuse tests passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
