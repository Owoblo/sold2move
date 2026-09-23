#!/usr/bin/env node
// GTA only adapts its census into the existing regional postcard pipeline.
const path=require('node:path');
const {synchronize}=require('./gta-pipeline-bridge.cjs');
const {runPipeline}=require('./postcard-pipeline.cjs');
const lib=require('./postcard-lib.cjs');
async function main(){
 const result=await synchronize({apply:true,seed:false});
 if(!result.summary.applied)throw Error('GTA inventory was not synchronized');
 const selected=await runPipeline(['--region','toronto','--skip-scrape']);
 const manifest=lib.readPipelineFile('batch-manifest.json');
 if(process.env.GTA_OWNER_DELIVERY==='true'&&selected.length){
  const base=path.join(__dirname,'..',`Toronto_Postcards_${manifest.batch_id}`);
  await require('./postcard-email-results.cjs').sendPostcardEmail('toronto',base+'.csv',base+'.pdf');
 }
 console.log(JSON.stringify({region:'toronto',batch_id:manifest.batch_id,qualified_envelopes:selected.length,delivery:process.env.GTA_OWNER_DELIVERY==='true'?'business@starmovers.ca only':'not requested',marked_mailed:false}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main};
