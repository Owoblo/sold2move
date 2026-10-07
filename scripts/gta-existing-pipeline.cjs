#!/usr/bin/env node
// GTA only adapts its census into the existing regional postcard pipeline.
const path=require('node:path');
const {synchronize,readOptional}=require('./gta-pipeline-bridge.cjs');
const {createClient}=require('@supabase/supabase-js');
const {runPipeline}=require('./postcard-pipeline.cjs');
const lib=require('./postcard-lib.cjs');
function assertSavedInventoryReady(snapshot,state,now=Date.now()){
 const age=now-Date.parse(snapshot?.collected_at);
 if(!state?.baseline_seeded||state.last_applied_run_id!==snapshot?.run_id||!Number.isFinite(age)||age<0||age>86400000){
  throw Error('Database-only GTA qualification requires a successfully synchronized inventory less than 24 hours old');
 }
}
async function main(){
 const databaseOnly=process.env.GTA_DATABASE_ONLY==='true';
 if(databaseOnly){
  const db=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const storage=db.storage.from('gta-inventory');
  // Collection may have advanced its pointer before a synchronization retry
  // applied the preceding equivalent snapshot. The applied marker is the
  // authority for database-only qualification, not the latest collection.
  const state=await readOptional(storage,'pipeline/state.json');
  const snapshot=state?.last_applied_run_id
   ? await readOptional(storage,`runs/${state.last_applied_run_id}/inventory.json`) : null;
  assertSavedInventoryReady(snapshot,state);
  console.log(`Qualifying synchronized GTA inventory ${snapshot.run_id} with saved photos; no Apify jobs`);
 }else{
  const result=await synchronize({apply:true,seed:false});
  if(!result.summary.applied)throw Error('GTA inventory was not synchronized');
 }
 const selected=await runPipeline(['--region','toronto','--skip-scrape',...(databaseOnly?['--skip-photos']:[])]);
 const manifest=lib.readPipelineFile('batch-manifest.json');
 if(process.env.GTA_OWNER_DELIVERY==='true'&&selected.length){
  const base=path.join(__dirname,'..',`Toronto_Postcards_${manifest.batch_id}`);
  await require('./postcard-email-results.cjs').sendPostcardEmail('toronto',base+'.csv',base+'.pdf');
 }
 console.log(JSON.stringify({region:'toronto',batch_id:manifest.batch_id,qualified_envelopes:selected.length,delivery:process.env.GTA_OWNER_DELIVERY==='true'?'business@starmovers.ca only':'not requested',marked_mailed:false}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main,assertSavedInventoryReady};
