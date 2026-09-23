#!/usr/bin/env node
// Read-only live check; no scrape, classification request, email, or DB update.
const fs=require('node:fs'),path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const {fetchExistingRegionListings}=require('./postcard-step0-scrape.cjs');
const {getRegionConfig}=require('./postcard-region-config.cjs');
const {readOptional,makePlan}=require('./gta-pipeline-bridge.cjs');
async function main(){
 const db=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),storage=db.storage.from('gta-inventory');
 const snapshot=await readOptional(storage,'latest.json'),state=await readOptional(storage,'pipeline/state.json');if(!state?.baseline_seeded)throw Error('Baseline connection has not been applied');
 const rows=await fetchExistingRegionListings(db,getRegionConfig('toronto'));
 const current=rows.filter(r=>Date.parse(r.last_seen_at)===Date.parse(snapshot.collected_at));if(current.length!==state.owned_current_count)throw Error(`Database baseline count mismatch: ${current.length}/${state.owned_current_count}`);
 const page=await db.from('listings').select('zpid,status,price,unformattedprice,addressstreet,addresszipcode,carouselphotos,property_classified_at,furniture_needs_retry').eq('region','toronto').eq('city','Toronto').eq('status','active').or('property_classified_at.is.null,furniture_needs_retry.eq.true').order('lastseenat',{ascending:false}).range(0,999);if(page.error)throw Error(`Normal pipeline recovery read failed: ${page.error.message}`);
 const normalized=current.map(r=>({...r,zpid:String(r.zpid)}));
 const replay=makePlan(normalized,normalized,snapshot.collected_at,false);
 if(replay.summary.justListedCount||replay.summary.soldCount||replay.inserts.length)throw Error('Same snapshot created spurious lifecycle events');
 const synthetic={...normalized[0],zpid:'9999999999999',addressstreet:'999999 GTA Readiness Test Road'};
 const simulated=makePlan([...normalized.slice(1),synthetic],normalized,new Date(Date.parse(snapshot.collected_at)+86400000).toISOString(),false);
 if(simulated.summary.justListedCount!==1||simulated.summary.soldCount!==1)throw Error('Existing next-batch lifecycle did not produce the expected single new and missing event');
 const report={same_snapshot_new_events:0,same_snapshot_sold_events:0,simulated_next_batch_new:1,simulated_next_batch_sold:1,classified_baseline_rows:current.filter(r=>r.property_classified_at).length,checked_at:new Date().toISOString(),preserved_inventory:snapshot.observed,connected_current_rows:current.length,baseline_run_id:state.baseline_run_id,normal_lifecycle_read_passed:true,normal_quality_recovery_query_passed:true,seed_status_counts:current.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),mail_sent:0};
 const out=path.join(__dirname,'..','reports','gta-pipeline-bridge');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'readiness.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
