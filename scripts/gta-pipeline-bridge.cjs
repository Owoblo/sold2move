#!/usr/bin/env node
// GTA adapter to the EXISTING regional lifecycle. No independent status rules.
const fs=require('node:fs'),path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const {getRegionConfig}=require('./postcard-region-config.cjs');
const {normalizeResult,normalizeForUpsert,buildLifecycleRows}=require('./postcard-step0-scrape.cjs');
const {normalizeClassification}=require('./postcard-step3-furniture.cjs');
const config=getRegionConfig('toronto');
const SEND_FIELDS=['just_listed_postcard_sent_at','sold_postcard_sent_at','last_postcard_sent_at','last_postcard_batch_id','last_postcard_type_sent','postcard_send_count'];
const legacyRegion=r=>!r||['toronto','gta','Ontario, Canada'].includes(r);
function prepareRows(snapshot,raw){
 const source=new Map(raw.map(r=>[String(r.zpid||r.id),r]));const rows=[],excluded=[];
 for(const item of snapshot.inventory.filter(r=>r.last_seen_at===snapshot.collected_at)){
  const original=source.get(String(item.zpid));if(!original)throw Error(`Source missing inventory ID ${item.zpid}`);
  const canonical={...original,listingAddress:{...original.listingAddress,city:item.municipality}};
  const row=normalizeResult(canonical,config,snapshot.collected_at);
  if(!row){excluded.push({zpid:item.zpid,reason:'no_usable_street_address'});continue;}
  row.search_days_on_zillow=item.data.days_on_zillow;
  rows.push(row);
 }
 return {rows,excluded};
}
function makePlan(scraped,existing,observedAt,seed,cache=[]){
 const prior=new Map(existing.map(r=>[String(r.zpid),r]));
 const protectedRows=scraped.filter(r=>prior.has(r.zpid)&&!legacyRegion(prior.get(r.zpid).region));
 const protectedIds=new Set(protectedRows.map(r=>r.zpid));
 const owned=scraped.filter(r=>!protectedIds.has(r.zpid));
 // Baseline initialization deliberately invokes seed mode and never promotes
 // old inventory. Mail history is retained, including legacy Ontario rows.
 const inputs=existing.filter(r=>legacyRegion(r.region)&&(r.region==='toronto'||owned.some(x=>x.zpid===String(r.zpid))))
  .map(r=>({...r,zpid:String(r.zpid),region:'toronto',...(seed?{status:'active'}:{})}));
 const result=buildLifecycleRows(owned,inputs,config,observedAt,{seedMode:seed});
 const currentIds=new Set(owned.map(r=>r.zpid));
 const cacheById=new Map(cache.filter(r=>r.classification).map(r=>[String(r.zpid),r]));
 const updates=[],inserts=[],statusUpdates=[];
 for(const proposed of result.nextRows){
  const old=prior.get(proposed.zpid);
  if(!currentIds.has(proposed.zpid)){
   if(seed)continue;
   if(old?.region!=='toronto')throw Error('Refusing to infer disappearance outside the GTA-owned inventory');
   statusUpdates.push({zpid:proposed.zpid,status:proposed.status,lastseenat:proposed.lastseenat,missing_scrape_count:proposed.missing_scrape_count,glitch_suspected:proposed.glitch_suspected});continue;
  }
  let row=normalizeForUpsert({...proposed,region:'toronto',...(seed?{status:'active'}:{})});
  const cached=cacheById.get(row.zpid);
  if(cached && (!old?.property_classified_at||Date.parse(old.property_classified_at)<=Date.parse('2026-09-23T17:40:59.298Z'))){
   const c=normalizeClassification(cached.classification,row);
   Object.assign(row,{market_segment:c.market_segment,listing_categories:c.listing_categories,occupancy_state:c.occupancy_state,outreach_target:c.outreach_target,property_signals:c.property_signals,classification_confidence:c.confidence,classification_reasons:c.reasons,property_classified_at:'2026-09-23T17:40:59.298Z',property_classification_method:'gta-full-august-policy',is_furnished:['furnished','partially_furnished'].includes(c.occupancy_state),furniture_confidence:c.confidence,furniture_scan_date:'2026-09-23T17:40:59.298Z',furniture_needs_retry:false});
  }
  if(old){for(const field of SEND_FIELDS)delete row[field];updates.push(row);}else inserts.push(row);
 }
 return {inserts,updates,statusUpdates,protectedIds:[...protectedIds],summary:{...result.summary,seed,insert_count:inserts.length,update_count:updates.length,sold_update_count:statusUpdates.length,protected_other_region_count:protectedIds.size}};
}
async function readOptional(storage,name){
 const split=name.lastIndexOf('/'),directory=split<0?'':name.slice(0,split),file=name.slice(split+1);
 const listed=await storage.list(directory,{search:file,limit:100});if(listed.error)throw Error(`Cannot inspect ${name}: ${listed.error.message}`);
 if(!listed.data.some(r=>r.name===file))return null;
 const r=await storage.download(name);if(r.error)throw Error(`Cannot read existing ${name}: ${r.error.message}`);
 return JSON.parse(await r.data.text());
}
async function put(storage,name,data){const r=await storage.upload(name,JSON.stringify(data),{contentType:'application/json',upsert:true});if(r.error)throw r.error;}
async function fetchByIds(db,ids){const rows=[];for(let i=0;i<ids.length;i+=100){const r=await db.from('listings').select('*').in('zpid',ids.slice(i,i+100));if(r.error)throw Error(`GTA listing read: ${r.error.message}`);rows.push(...r.data);}return rows;}
async function regionIds(db){const ids=[];for(let from=0;;from+=500){const r=await db.from('listings').select('zpid').eq('region','toronto').order('zpid').range(from,from+499);if(r.error)throw Error(`GTA ownership read: ${r.error.message}`);ids.push(...r.data.map(x=>String(x.zpid)));if(r.data.length<500)break;}return ids;}
async function synchronize({apply=false,seed=false,rawFile=process.env.GTA_BRIDGE_RAW_FILE}={}){
 const db=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),storage=db.storage.from('gta-inventory');
 const snapshot=await readOptional(storage,'latest.json');if(!snapshot?.inventory?.length)throw Error('Preserved GTA inventory missing');
 const immutable=await readOptional(storage,`runs/${snapshot.run_id}/inventory.json`);if(JSON.stringify(snapshot)!==JSON.stringify(immutable))throw Error('Latest snapshot differs from immutable preserved run');
 const marker=await readOptional(storage,'pipeline/state.json');
 if(!marker&&!seed)throw Error('GTA baseline must be seeded before normal lifecycle processing');
 if(marker&&seed&&marker.baseline_run_id!==snapshot.run_id)throw Error('Cannot reseed over an established GTA baseline');
 if(marker&&!seed&&snapshot.collected_at<marker.last_observed_at)throw Error('Refusing old snapshot');
 const raw=JSON.parse(fs.readFileSync(rawFile));const prepared=prepareRows(snapshot,raw);
 const allIds=[...new Set([...prepared.rows.map(r=>r.zpid),...await regionIds(db)])];
 const existing=await fetchByIds(db,allIds);
 let cache=[];const dirs=await storage.list('qualification',{limit:100});if(dirs.error)throw dirs.error;
 for(const entry of (dirs.data||[]).filter(r=>r.name.startsWith('gta-full-qualified-20260923-'))){const classified=await readOptional(storage,`qualification/${entry.name}/classified.json`);if(classified)cache.push(...classified);}
 const plan=makePlan(prepared.rows,existing,snapshot.collected_at,seed,cache);
 const out=path.join(__dirname,'..','reports','gta-pipeline-bridge');fs.mkdirSync(out,{recursive:true});
 const summary={snapshot_run_id:snapshot.run_id,preserved_inventory:snapshot.observed,immutable_snapshot_matches:true,...plan.summary,unaddressable_records:prepared.excluded.length,classification_cache_rows:cache.length,applied:false,mail_sent:0};
 fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 if(!apply)return {summary,plan};
 const key=`pipeline/backups/${snapshot.run_id}/${Date.now()}`;
 // Preserve the complete old GTA/legacy rows before any write; other-region
 // records are never included in the mutation plan.
 const changedIds=new Set([...plan.updates,...plan.statusUpdates].map(r=>r.zpid));
 await put(storage,key+'/previous-records.json',existing.filter(r=>changedIds.has(String(r.zpid))));
 await put(storage,key+'/inserted-ids.json',plan.inserts.map(r=>r.zpid));
 for(let i=0;i<plan.inserts.length;i+=100){const r=await db.from('listings').upsert(plan.inserts.slice(i,i+100),{onConflict:'zpid',ignoreDuplicates:true});if(r.error)throw Error(`GTA seed insert: ${r.error.message}`);}
 // Group identical column sets: omit mailing fields altogether on updates,
 // so an independently confirmed mailing cannot be overwritten by this read.
 const groups=new Map();for(const row of plan.updates){const clean=Object.fromEntries(Object.entries(row).filter(([,v])=>v!==undefined));const key=Object.keys(clean).sort().join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(clean);}
 for(const rows of groups.values())for(let i=0;i<rows.length;i+=100){const r=await db.from('listings').upsert(rows.slice(i,i+100),{onConflict:'zpid'});if(r.error)throw Error(`GTA inventory update: ${r.error.message}`);}
 for(const row of plan.statusUpdates){const {zpid,...patch}=row;const r=await db.from('listings').update(patch).eq('zpid',zpid).eq('region','toronto');if(r.error)throw Error(`GTA lifecycle update: ${r.error.message}`);}
 const verify=await fetchByIds(db,[...new Set([...plan.inserts,...plan.updates].map(r=>r.zpid))]);const verified=new Map(verify.map(r=>[String(r.zpid),r]));
 for(const row of [...plan.inserts,...plan.updates]){const saved=verified.get(row.zpid);if(!saved||saved.region!=='toronto'||saved.status!==row.status)throw Error(`GTA write verification failed for ${row.zpid}`);const old=existing.find(r=>String(r.zpid)===row.zpid);if(old)for(const field of SEND_FIELDS)if(JSON.stringify(saved[field]??null)!==JSON.stringify(old[field]??null))throw Error(`Mail history changed during sync: ${row.zpid}/${field}`);}
 await put(storage,'pipeline/state.json',{baseline_run_id:marker?.baseline_run_id||snapshot.run_id,last_applied_run_id:snapshot.run_id,last_observed_at:snapshot.collected_at,baseline_seeded:true,backup:key,owned_current_count:verified.size});
 summary.applied=true;summary.verified_database_rows=verified.size;summary.backup=key;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));return {summary,plan};
}
if(require.main===module)synchronize({apply:process.argv.includes('--apply'),seed:process.argv.includes('--seed')}).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={prepareRows,makePlan,synchronize,readOptional};
