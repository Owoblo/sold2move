#!/usr/bin/env node
// Read-only qualification. No listing mutations, print claims, or email sends.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const Papa = require('papaparse');
const { PDFDocument } = require('pdf-lib');
const { serviceClient, filterPrintClaims, onePiecePerProperty } = require('./pipeline-review-lib.cjs');
const { applyOutputFilters, normalizeAddressKey, generatePDF } = require('./postcard-step5-output.cjs');
const { verifyLocalAddress } = require('./postcard-step4-geocode.cjs');
const out = path.join(__dirname, '..', 'reports', 'gta-candidate-validation');
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
function statusDecision(detail, observedAt) {
  if (!detail) return { decision: 'held', reason: 'no_current_detail' };
  const status = String(detail.homeStatus || detail.hdpData?.homeInfo?.homeStatus || detail.listingStatus || detail.status || '').trim().replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toUpperCase();
  if (['FOR_SALE','PENDING','COMING_SOON','ACTIVE','FOR_RENT','CONTINGENT'].includes(status)) return { decision: 'excluded', reason: `currently_${status.toLowerCase()}`, status };
  const events = (detail.priceHistory || detail.listingPriceHistory || []).filter(e => /^(sold|sale)$/i.test(String(e.event || '')))
    .map(e => ({ event: e.event, date: e.date, time: Date.parse(e.date) || Number(e.time) })).filter(e => Number.isFinite(e.time));
  const sale = events.sort((a,b) => b.time-a.time)[0];
  const after = Date.parse(observedAt);
  if (sale && sale.time >= after && sale.time <= Date.now() && ['SOLD','RECENTLY_SOLD','OFF_MARKET'].includes(status)) return { decision: 'verified_sold', reason: 'sale_event_after_prior_active_observation', status, sale_date: new Date(sale.time).toISOString() };
  if (['SOLD','RECENTLY_SOLD'].includes(status)) return { decision: 'verified_sold', reason: 'current_explicit_sold_status', status };
  if (status === 'OFF_MARKET') return { decision: 'held', reason: 'off_market_without_recent_sale_evidence', status };
  return { decision: 'held', reason: `unconfirmed_status:${status || 'missing'}`, status };
}
async function api(endpoint, body) {
  const response = await fetch(`https://api.apify.com/v2/${endpoint}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}`, 'Content-Type':'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Apify HTTP ${response.status}`);
  return response.json();
}
async function details(rows, key) {
  const started = await api('acts/maxcopell~zillow-detail-scraper/runs', { startUrls: rows.map(r => ({url:r.detailurl})), extractBuildingUnits:'disabled' });
  const run = started.data;
  save(`actor-${key}.json`, {run_id:run.id,dataset_id:run.defaultDatasetId,count:rows.length});
  console.log(`Detail check ${key}: ${rows.length} properties; run ${run.id}`);
  const deadline = Date.now()+45*60*1000;
  let state = run;
  while (['READY','RUNNING'].includes(state.status)) {
    if (Date.now()>deadline) { await api(`actor-runs/${run.id}/abort`, {}); throw new Error(`Detail check ${key} exceeded 45 minutes`); }
    await new Promise(resolve => setTimeout(resolve, 10000));
    state = (await api(`actor-runs/${run.id}`)).data;
  }
  if(state.status!=='SUCCEEDED') throw new Error(`Detail check ${key}: ${state.status}`);
  const data = await api(`datasets/${run.defaultDatasetId}/items?format=json`);
  if(!Array.isArray(data)) throw new Error('Detail dataset is not an array');
  save(`details-${key}.json`,data);
  console.log(`Detail check ${key}: ${data.length} results`);
  return data;
}
async function readMailHistory(db) {
  const history = [];
  let lastId = null, scanned = 0;
  for(;;){
    let query=db.from('listings').select('zpid,addressstreet,addresszipcode,just_listed_postcard_sent_at,sold_postcard_sent_at,postcard_send_count,last_postcard_sent_at').order('zpid').limit(1000);
    if(lastId!==null)query=query.gt('zpid',lastId);
    const {data,error}=await query;
    if(error)throw new Error(`Mail history unavailable: ${error.message}`);
    history.push(...data.filter(r=>r.just_listed_postcard_sent_at||r.sold_postcard_sent_at||Number(r.postcard_send_count)>0));
    scanned+=data.length;
    if(scanned%25000===0)console.log(`Mail history: checked ${scanned} records`);
    if(data.length<1000)break;
    const next=data.at(-1).zpid;if(next===lastId)throw new Error('Mail history cursor did not advance');lastId=next;
  }
  return history;
}
async function main() {
  fs.mkdirSync(out,{recursive:true});
  const encoded = Array.from({length:6},(_,i)=>process.env[`GTA_CANDIDATES_${i+1}`]||'').join('');
  const input = JSON.parse(zlib.gunzipSync(Buffer.from(encoded,'base64')));
  const db = serviceClient(); if(!db) throw new Error('Service credentials required');
  const downloaded = await db.storage.from('gta-inventory').download('latest.json'); if(downloaded.error)throw downloaded.error;
  const snapshot = JSON.parse(await downloaded.data.text());
  if(Date.now()-Date.parse(snapshot.collected_at)>48*3600000)throw new Error('Current inventory is older than 48 hours');
  const active = snapshot.inventory.filter(r=>r.last_seen_at===snapshot.collected_at);
  const activeIds = new Set(active.map(r=>String(r.zpid)));
  const activeAddresses = new Set(active.map(r=>normalizeAddressKey({addressstreet:r.data.street,addresszipcode:r.data.postal_code})));
  // Read every historical send, irrespective of legacy region labels or listing ID.
  const history = await readMailHistory(db);
  const rejected=[], prepared=[];
  for(const source of input){
    const r={...source};const address=normalizeAddressKey(r);
    if(activeIds.has(String(r.zpid))||activeAddresses.has(address)){rejected.push({zpid:r.zpid,reason:'still_active_by_id_or_address'});continue;}
    const prior=history.filter(h=>String(h.zpid)===String(r.zpid)||normalizeAddressKey(h)===address);
    if(prior.some(h=>h.sold_postcard_sent_at||Number(h.postcard_send_count)>=2)){rejected.push({zpid:r.zpid,reason:'sold_already_sent_or_two_send_cap'});continue;}
    const jl=prior.find(h=>h.just_listed_postcard_sent_at);if(jl)r.just_listed_postcard_sent_at=jl.just_listed_postcard_sent_at;
    r.postcard_send_count=prior.reduce((n,h)=>Math.max(n,Number(h.postcard_send_count)||0),0);
    const geo=verifyLocalAddress(r);r._geocode_verified=geo.verified;r._geocode_reason=geo.reason;
    if(r.addressstate!=='ON'||r.unformattedprice<300000){rejected.push({zpid:r.zpid,reason:'province_or_price_filter'});continue;}
    prepared.push(r);
  }
  const filtered=applyOutputFilters(prepared,{});rejected.push(...filtered.rejected);
  const claims=await filterPrintClaims(filtered.finalListings);rejected.push(...claims.rejected);
  const unique=onePiecePerProperty(claims.kept);rejected.push(...unique.rejected);
  save('preflight.json',{input:input.length,eligible_for_status_check:unique.kept.length,historical_send_rows:history.length,rejected});
  console.log(`Preflight: ${input.length} candidates, ${unique.kept.length} ready for status checks, ${rejected.length} excluded/held`);
  const byId=new Map();const ingest=items=>{for(const d of items){const id=String(d.zpid||d.id||String(d.url||d.detailUrl||'').match(/(\d+)_zpid/)?.[1]||'');if(id)byId.set(id,d);}};
  const recovery = process.env.GTA_VALIDATION_RECOVERY;
  if(recovery && fs.existsSync(recovery))for(const file of fs.readdirSync(recovery).filter(f=>/^details-.*\.json$/.test(f)))ingest(JSON.parse(fs.readFileSync(path.join(recovery,file))));
  const remaining=unique.kept.filter(r=>!byId.has(String(r.zpid)));
  console.log(`Reused ${byId.size} existing detail results; ${remaining.length} still need checks`);
  const pilot=remaining.slice(0,25);
  if(pilot.length){ingest(await details(pilot,'pilot'));if(!pilot.some(r=>byId.has(String(r.zpid))))throw new Error('Pilot returned no matching property IDs; holding remaining checks');}
  const chunks=[];for(let i=25;i<remaining.length;i+=250)chunks.push(remaining.slice(i,i+250));
  let next=0;const failures=[];
  await Promise.all(Array.from({length:Math.min(3,chunks.length)},async()=>{while(next<chunks.length){const idx=next++;try{ingest(await details(chunks[idx],String(idx+1)));}catch(e){failures.push({chunk:idx+1,error:e.message});save('failures.json',failures);}}}));
  const decisions=unique.kept.map(r=>({...r,...statusDecision(byId.get(String(r.zpid)),r.observed_at)}));
  const selected=decisions.filter(r=>r.decision==='verified_sold');
  save('decisions.json',decisions);save('rejected.json',rejected);save('qualified-sold.json',selected);
  for(const [name,rows]of [['all-status-decisions',decisions],['qualified-sold',selected]])fs.writeFileSync(path.join(out,`${name}.csv`),Papa.unparse(rows,{escapeFormulae:true}));
  let pages=0;if(selected.length){const file=path.join(out,'Toronto_GTA_Verified_Sold_Front_Only.pdf');await generatePDF(selected,file,{region:'toronto'});pages=(await PDFDocument.load(fs.readFileSync(file))).getPageCount();if(pages!==selected.length)throw new Error('Envelope page count mismatch');}
  const summary={checked_at:new Date().toISOString(),input_candidates:input.length,filtered_before_status_check:rejected.length,status_checked:byId.size,verified_sold_envelopes:selected.length,pdf_pages:pages,decisions:decisions.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{}),failures,mail_sent:0,recipient:'business@starmovers.ca',just_listed_note:'Separate event; prior just-listed mailing does not block sold. This run validates the missing August audience only.',address_check:'Existing local Canadian address format validation; not a postal deliverability guarantee.'};save('summary.json',summary);console.log(JSON.stringify(summary,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={statusDecision,readMailHistory};
