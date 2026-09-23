#!/usr/bin/env node
// Read-only live check; no scrape, classification request, email, or DB update.
const fs=require('node:fs'),path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const {fetchExistingRegionListings}=require('./postcard-step0-scrape.cjs');
const {getRegionConfig}=require('./postcard-region-config.cjs');
const {readOptional}=require('./gta-pipeline-bridge.cjs');
async function main(){
 const db=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),storage=db.storage.from('gta-inventory');
 const snapshot=await readOptional(storage,'latest.json'),state=await readOptional(storage,'pipeline/state.json');if(!state?.baseline_seeded)throw Error('Baseline connection has not been applied');
 const rows=await fetchExistingRegionListings(db,getRegionConfig('toronto'));
 const current=rows.filter(r=>r.last_seen_at===snapshot.collected_at);if(current.length!==state.owned_current_count)throw Error(`Database baseline count mismatch: ${current.length}/${state.owned_current_count}`);
 const page=await db.from('listings').select('zpid,status,price,unformattedprice,addressstreet,addresszipcode,carouselphotos,property_classified_at,furniture_needs_retry').eq('region','toronto').eq('city','Toronto').eq('status','active').or('property_classified_at.is.null,furniture_needs_retry.eq.true').order('lastseenat',{ascending:false}).range(0,999);if(page.error)throw Error(`Normal pipeline recovery read failed: ${page.error.message}`);
 const report={checked_at:new Date().toISOString(),preserved_inventory:snapshot.observed,connected_current_rows:current.length,baseline_run_id:state.baseline_run_id,normal_lifecycle_read_passed:true,normal_quality_recovery_query_passed:true,seed_status_counts:current.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),mail_sent:0};
 const out=path.join(__dirname,'..','reports','gta-pipeline-bridge');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'readiness.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
