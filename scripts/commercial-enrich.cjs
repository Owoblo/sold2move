const fs=require('fs'),path=require('path');
const {query}=require('./market-db.cjs');
const {candidate,key,detailFingerprint}=require('./commercial-outreach-lib.cjs');
const {splitCommercialAddress,classifyCommercialRelocation}=require('./commercial-market-lib.cjs');
const costs=require('./postcard-cost-report.cjs');
const quote=v=>`'${String(v).replaceAll("'","''")}'`;
async function api(route,token,body){const response=await fetch(`https://api.apify.com/v2/${route}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`Detail API HTTP ${response.status}`);return response.json();}
function merge(row,detail){
 if(detail.description)row.description=detail.description;
 if(detail.imageUrls?.length)row.photo_urls=[...new Set(detail.imageUrls)].filter(u=>!/\/medres\//.test(u));
 if(detail.address){const address=detail.address.replace(/,\s*[^,]+,\s*Ontario.*$/i,'');const identity=splitCommercialAddress(address);if(identity.unit_label)row.unit_label=identity.unit_label;}
 Object.assign(row,classifyCommercialRelocation(row));return row;
}
async function enrich(runDir,{db=query,request=api,ledgerDir=path.join(__dirname,'../reports/apify-costs')}={}){
 const file=path.join(runDir,'source-records.json'),rows=JSON.parse(fs.readFileSync(file));
 const prior=await db('SELECT source,source_listing_id,detail_fingerprint,details_fetched_at,details_payload FROM commercial_source_records WHERE details_fetched_at IS NOT NULL');const cache=new Map(prior.map(r=>[key(r),r]));
 const targets=rows.filter(r=>candidate(r)&&r.source==='realtor_ca_commercial');let reused=0,enriched=0;const pending=[];
 for(const row of targets){row.detail_source_fingerprint ||= detailFingerprint(row);const old=cache.get(key(row)),age=Date.now()-Date.parse(old?.details_fetched_at);if(old?.detail_fingerprint===row.detail_source_fingerprint&&age>=0&&age<30*86400000&&old.details_payload){merge(row,old.details_payload);row.details_fetched_at=old.details_fetched_at;reused++;}else pending.push(row);}
 // Recover completed paid detail datasets from interrupted jobs before starting new actors.
 const runIds=new Set();
 if(fs.existsSync(ledgerDir)) for(const name of fs.readdirSync(ledgerDir).filter(n=>n.includes(path.basename(runDir))&&n.endsWith('.jsonl'))){
   for(const line of fs.readFileSync(path.join(ledgerDir,name),'utf8').split('\n').filter(Boolean)){const item=JSON.parse(line);if(item.stage==='details'&&item.id)runIds.add(item.id);}
 }
 const needed=new Map(pending.map(r=>[r.source_listing_id,r]));let recovered=0;
 for(const id of runIds){
   const old=(await request(`actor-runs/${id}`,process.env.APIFY_TOKEN)).data;
   if(['READY','RUNNING'].includes(old.status)) throw new Error(`Previously paid detail run ${id} is still active; wait before resuming to avoid duplicate charges`);
   if(!old.defaultDatasetId)continue;
   const saved=await request(`datasets/${old.defaultDatasetId}/items?clean=true&limit=1000`,process.env.APIFY_TOKEN);
   for(const detail of saved){const row=needed.get(String(detail.propertyId));if(!row)continue;
     merge(row,detail);row.details_fetched_at=old.finishedAt||new Date().toISOString();
     await db(`UPDATE commercial_source_records SET detail_fingerprint=${quote(row.detail_source_fingerprint)},details_fetched_at=${quote(row.details_fetched_at)},details_payload=${quote(JSON.stringify(detail))}::jsonb,description=${quote(row.description||'')},unit_label=${row.unit_label?quote(row.unit_label):'NULL'} WHERE source=${quote(row.source)} AND source_listing_id=${quote(row.source_listing_id)}`);
     needed.delete(row.source_listing_id);recovered++;
   }
   fs.writeFileSync(file,JSON.stringify(rows,null,2));
 }
 pending.splice(0,pending.length,...needed.values());
 console.log(`Commercial detail recovery: ${reused} cached; ${recovered} recovered from paid datasets; ${pending.length} remaining`);
 const chunks=[];for(const region of [...new Set(pending.map(r=>r.acquisition_scope))]){const regional=pending.filter(r=>r.acquisition_scope===region);for(let i=0;i<regional.length;i+=50)chunks.push({region,rows:regional.slice(i,i+50),part:i});}
 let next=0;const failures=[];async function worker(){while(next<chunks.length){const chunk=chunks[next++];const context={region:`commercial-${chunk.region}`,file:costs.startTracking(`commercial-${chunk.region}`,`commercial-${path.basename(runDir)}-details-${chunk.region}-${chunk.part}`)};try{
 const pilot=process.env.COMMERCIAL_DETAIL_PILOT_RUN_ID&&chunk.rows.some(r=>r.source_listing_id==='30239396');let saved=[];
 if(pilot){const r=(await request(`actor-runs/${process.env.COMMERCIAL_DETAIL_PILOT_RUN_ID}`,process.env.APIFY_TOKEN)).data;costs.recordRun(r,'details',context);if(r.status==='SUCCEEDED')saved=await request(`datasets/${r.defaultDatasetId}/items?clean=true`,process.env.APIFY_TOKEN);}
 const savedIds=new Set(saved.map(d=>String(d.propertyId)));const remaining=chunk.rows.filter(r=>!savedIds.has(r.source_listing_id));
 if(remaining.length){const started=(await request('acts/muhammadafzal~realtor-ca-api-scraper/runs',process.env.APIFY_TOKEN,{startUrls:remaining.map(r=>({url:r.source_url})),maxResults:remaining.length,enrichPropertyDetails:true,enrichAgentProfiles:false,responseFormat:'detailed'})).data;costs.recordRun(started,'details',context);let run=started;const start=Date.now();while(['READY','RUNNING'].includes(run.status)){if(Date.now()-start>45*60000){await request(`actor-runs/${run.id}/abort`,process.env.APIFY_TOKEN,{});throw new Error('Commercial detail batch exceeded 45 minutes and was aborted');}await new Promise(r=>setTimeout(r,10000));run=(await request(`actor-runs/${run.id}`,process.env.APIFY_TOKEN)).data;}if(run.status!=='SUCCEEDED')throw new Error(`Commercial detail batch ${run.status}`);saved.push(...await request(`datasets/${run.defaultDatasetId}/items?clean=true&limit=1000`,process.env.APIFY_TOKEN));}
 const indexed=new Map(saved.map(d=>[String(d.propertyId),d]));for(const row of chunk.rows){const detail=indexed.get(row.source_listing_id);if(!detail){failures.push({source:key(row),reason:'No returned listing detail'});continue;}merge(row,detail);row.details_fetched_at=new Date().toISOString();await db(`UPDATE commercial_source_records SET detail_fingerprint=${quote(row.detail_source_fingerprint)},details_fetched_at=now(),details_payload=${quote(JSON.stringify(detail))}::jsonb,description=${quote(row.description||'')},unit_label=${row.unit_label?quote(row.unit_label):'NULL'} WHERE source=${quote(row.source)} AND source_listing_id=${quote(row.source_listing_id)}`);enriched++;}
 fs.writeFileSync(file,JSON.stringify(rows,null,2));console.log(`Commercial details ${chunk.region}: ${chunk.rows.length} checked; ${enriched} enriched so far`);
 }catch(e){failures.push({region:chunk.region,count:chunk.rows.length,reason:e.message});}}}
 await Promise.all([worker(),worker(),worker()]);fs.writeFileSync(file,JSON.stringify(rows,null,2));fs.writeFileSync(path.join(runDir,'detail-summary.json'),JSON.stringify({targets:targets.length,reused,recovered,enriched,failures},null,2));
}
module.exports={enrich,merge};if(require.main===module)enrich(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1});
