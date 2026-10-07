#!/usr/bin/env node
// Read-only production audit via the same indexed API as the pipeline.
const fs=require('node:fs'),path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
async function main(){
 const db=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const out=path.join(__dirname,'..','reports','monday-readiness');fs.mkdirSync(out,{recursive:true});
 const report={checked_at:new Date().toISOString(),rows:[]};
 const columns='zpid,region,status,first_seen_at,lastseenat,glitch_suspected,unformattedprice,just_listed_postcard_sent_at,sold_postcard_sent_at,property_classified_at,occupancy_state,market_segment,postcard_skip_reason,detail_days_on_zillow,zillow_detail_checked_at';
 for(const region of ['windsor','chatham','sarnia','london','woodstock','wkg','ottawa','toronto']){
  for(const status of ['active','just_listed','sold','sold_archived']){
   const summary={region,status,total:0,original_window:0,corrected_window:0,first_seen_last_two_weeks:0,current_above_price_not_glitch:0,current_unmailed_new:0,classified:0,latest_observation:null,observations_by_day:{},rejection_reasons:{},sample_new_ids:[]};
   let offset=0,size=500;
   while(true){
    const r=await db.from('listings').select(columns).eq('region',region).eq('status',status).order('zpid').range(offset,offset+size-1);
    if(r.error){if(/statement timeout|canceling statement/i.test(r.error.message)&&size>25){size=Math.max(25,Math.floor(size/2));continue;}throw Error(`${region}/${status}: ${r.error.message}`);}
    for(const row of r.data){
     const observed=String(row.lastseenat||'');summary.total++;
     if(observed>='2026-09-23'&&observed<'2026-10-07')summary.original_window++;
     if(observed>='2026-09-23'&&observed<'2026-10-08')summary.corrected_window++;
     if(String(row.first_seen_at||'')>='2026-09-23')summary.first_seen_last_two_weeks++;
     if(observed>='2026-10-07'&&row.glitch_suspected===false&&(row.unformattedprice>=300000||row.unformattedprice===0))summary.current_above_price_not_glitch++;
     if(status==='just_listed'&&!row.just_listed_postcard_sent_at&&observed>='2026-10-07'){summary.current_unmailed_new++;if(summary.sample_new_ids.length<5)summary.sample_new_ids.push(row.zpid);}
     if(row.property_classified_at)summary.classified++;
     if(observed>(summary.latest_observation||''))summary.latest_observation=observed;
     const day=observed.slice(0,10);summary.observations_by_day[day]=(summary.observations_by_day[day]||0)+1;
     if(row.postcard_skip_reason)summary.rejection_reasons[row.postcard_skip_reason]=(summary.rejection_reasons[row.postcard_skip_reason]||0)+1;
    }
    offset+=r.data.length;if(r.data.length<size)break;
   }
   report.rows.push(summary);console.log(JSON.stringify(summary));
   fs.writeFileSync(path.join(out,'recovery-database-audit.json'),JSON.stringify(report,null,2));
  }
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
