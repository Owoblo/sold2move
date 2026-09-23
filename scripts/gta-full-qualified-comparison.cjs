#!/usr/bin/env node
// Compare full September inventory using August's exact qualification request and export criteria.
// No mailing, listing mutations, or regional lifecycle changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const OpenAI=require('openai'),Papa=require('papaparse');
const {normalize}=require('./gta-market-census.cjs');
const {photosOf,deterministicReason,requestFor,safeClassification}=require('./gta-full-vision-qualification.cjs');
const {normalizeAddressKey}=require('./postcard-step5-output.cjs');
const {createClient}=require('@supabase/supabase-js');
const out=path.join(__dirname,'..','reports','gta-full-qualified-comparison');
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
const identity=row=>normalizeAddressKey({addressstreet:row.street,addresszipcode:row.postal_code});
function augustQualified(c){return c?.occupancy_state==='furnished'&&c?.market_segment==='owner_occupied'&&c?.outreach_target==='homeowner'&&Number(c?.confidence)>=0.9;}
function qualifiedDiff(oldAudience,newAudience,currentInventory){
 const oldIds=new Set(oldAudience.map(r=>String(r.zpid))),oldAddresses=new Set(oldAudience.map(identity));
 const currentIds=new Set(currentInventory.map(r=>String(r.zpid))),currentAddresses=new Set(currentInventory.map(identity));
 return {just_listed_candidates:newAudience.filter(r=>!oldIds.has(String(r.zpid))&&!oldAddresses.has(identity(r))),sold_candidates:oldAudience.filter(r=>!currentIds.has(String(r.zpid))&&!currentAddresses.has(identity(r))),interpretation:'Just listed means newly eligible versus the August qualified audience; sold is inferred disappearance under the existing regional rule. Quality changes can affect qualified-audience membership.'};
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const raw=JSON.parse(fs.readFileSync(process.env.GTA_FULL_RAW_FILE));const unique=[...new Map(raw.map(r=>[String(r.zpid||r.id),r])).values()];const manifest=[],requests=[],rejected=[],current=[];
 for(const item of unique){const row=normalize(item),photos=photosOf(item);if(row.municipality&&row.state==='ON')current.push(row);const reason=deterministicReason(row,photos);if(reason){rejected.push({zpid:row.zpid,municipality:row.municipality,reason});continue;}manifest.push({...row,photo_count_scanned:photos.length});requests.push(requestFor(row,photos));}
 if(current.length!==25520)throw Error(`Unexpected recovered September inventory: ${current.length}`);
 const digest=crypto.createHash('sha256').update(JSON.stringify(requests)).digest('hex');const jobKey=`gta-full-qualified-20260923-${digest.slice(0,16)}`;
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
 const db=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});const storage=db.storage.from('gta-inventory');
 async function preserve(name,value){const result=await storage.upload(`qualification/${jobKey}/${name}`,JSON.stringify(value),{contentType:'application/json',upsert:true});if(result.error)throw result.error;save(name,value);}
 await preserve('manifest.json',manifest);await preserve('deterministic-rejections.json',rejected);
 const previous=await client.batches.list({limit:100});const batches=[];
 for(let start=0,index=0;start<requests.length;start+=4500,index++){
  const part=requests.slice(start,start+4500),key=`${jobKey}-part-${index+1}`;
  let batch=previous.data.find(b=>b.metadata?.job_key===key&&!['failed','expired','cancelled'].includes(b.status));
  if(!batch){const file=path.join(out,`requests-${index+1}.jsonl`);fs.writeFileSync(file,part.map(r=>JSON.stringify(r)).join('\n')+'\n');const uploaded=await client.files.create({file:fs.createReadStream(file),purpose:'batch'});batch=await client.batches.create({input_file_id:uploaded.id,endpoint:'/v1/chat/completions',completion_window:'24h',metadata:{job_key:key,input_sha256:digest,policy:'august-2026-exact'}});}
  batches.push({id:batch.id,key,count:part.length,status:batch.status});await preserve('batches.json',batches);
 }
 const submission={job_key:jobKey,raw_inventory:current.length,photo_qualification_requests:requests.length,deterministic_rejections:rejected.filter(r=>r.municipality).length,batches,policy:'August photo prompt, model, six-photo sampling and export thresholds; no new listing-age prefilter',mail_sent:0};await preserve('submission.json',submission);console.log(JSON.stringify(submission,null,2));
 if(process.env.GTA_QUALIFICATION_MODE==='submit')return;
 const deadline=Date.now()+310*60000;let completed=[];
 while(Date.now()<deadline){completed=await Promise.all(batches.map(b=>client.batches.retrieve(b.id)));await preserve('batch-progress.json',completed.map(b=>({id:b.id,status:b.status,request_counts:b.request_counts})));console.log(completed.map(b=>`${b.id}: ${b.status} ${b.request_counts?.completed||0}/${b.request_counts?.total||0}`).join('\n'));if(completed.every(b=>['completed','failed','expired','cancelled'].includes(b.status)))break;await new Promise(r=>setTimeout(r,45000));}
 if(!completed.every(b=>b.status==='completed')){await preserve('pending.json',{at:new Date().toISOString(),reason:'Qualification not complete; resume this workflow to reuse submitted batches'});throw Error('Full qualification remains pending; no complete diff or mailing was produced');}
 const outputs=[];for(const batch of completed){if(batch.output_file_id){const response=await client.files.content(batch.output_file_id);outputs.push(...(await response.text()).split('\n').filter(Boolean).map(JSON.parse));}}
 const byId=new Map(outputs.map(r=>[r.custom_id,safeClassification(r)]));const classified=manifest.map(r=>({...r,...(byId.get(`zpid-${r.zpid}`)||{error:'No classifier output'})}));await preserve('classified.json',classified);
 const unresolved=classified.filter(r=>!r.classification);await preserve('unresolved.json',unresolved);if(unresolved.length)throw Error(`${unresolved.length} classifications unresolved; complete-audience comparison held for retry`);
 const seen=new Set();const audience=classified.filter(r=>augustQualified(r.classification)).filter(r=>{const key=identity(r);if(seen.has(key))return false;seen.add(key);return true;});await preserve('qualified-audience.json',audience);
 const encoded=Array.from({length:6},(_,i)=>process.env[`GTA_AUGUST_AUDIENCE_${i+1}`]||'').join('');const old=JSON.parse(zlib.gunzipSync(Buffer.from(encoded,'base64')));if(old.length!==10904)throw Error('Incomplete August audience');
 const diff=qualifiedDiff(old,audience,current);await preserve('qualified-audience-diff.json',diff);
 for(const [name,rows]of [['qualified-audience',audience],['just-listed-candidates',diff.just_listed_candidates],['sold-candidates',diff.sold_candidates]])fs.writeFileSync(path.join(out,name+'.csv'),Papa.unparse(rows,{escapeFormulae:true}));
 const summary={...submission,old_qualified:old.length,new_qualified:audience.length,just_listed_candidates:diff.just_listed_candidates.length,sold_candidates:diff.sold_candidates.length,mailing_status:'Comparison complete; final event-specific mailing-history and print checks still required',interpretation:diff.interpretation};await preserve('summary.json',summary);console.log(JSON.stringify(summary,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={augustQualified,qualifiedDiff};
