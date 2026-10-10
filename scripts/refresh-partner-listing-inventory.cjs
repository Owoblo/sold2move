#!/usr/bin/env node
// Internal listing -> partner bridge. No provider, print or outreach operations.
const fs=require('node:fs');
const {serviceClient}=require('./pipeline-review-lib.cjs');
const {sync,allRows,representatives}=require('./partnership-listing-sync.cjs');
async function run(){
 const apply=process.argv.includes('--apply'), db=serviceClient();if(!db)throw Error('Service credentials required');
 const days=Number(process.env.PARTNER_EVENT_LOOKBACK_DAYS||14);if(!Number.isInteger(days)||days<1||days>90)throw Error('Lookback must be 1–90 days');
 const since=new Date(Date.now()-days*86400000).toISOString();let rows=[];
 const {REGION_CONFIG}=require('./postcard-region-config.cjs');
 // Use the production region/status/zpid index. Avoid a whole-table date sort.
 for(const region of Object.keys(REGION_CONFIG))for(const status of ['just_listed','active','sold','sold_archived']){
  let after=null;
  for(;;){let q=db.from('listings').select('zpid,region,addressstreet,addresscity,addressstate,addresszipcode,status,detailurl,listing_representatives,listing_agent_names,listing_mls_id,listing_attribution_captured_at,lastseenat,postcard_skip_reason,is_furnished,unformattedprice,listing_categories,market_segment,occupancy_state,outreach_target,last_postcard_batch_id,last_postcard_type_sent').eq('region',region).eq('status',status).order('zpid').limit(250);if(after!==null)q=q.gt('zpid',after);
   const {data,error}=await q;if(error)throw Error(region+': '+error.message);
   rows.push(...data.filter(r=>Date.parse(r.lastseenat)>=Date.parse(since)));
   if(data.length<250)break;after=data.at(-1).zpid;
  }
 }
 const report={mode:apply?'apply':'preview',since,properties:rows.length,unmapped:rows.filter(r=>r.region==='unmapped').length,with_representatives:rows.filter(r=>Array.isArray(r.listing_representatives)&&r.listing_representatives.length).length,results:[]};
 if(apply){const contacts=await allRows(db,'market_contacts','id,name,company,email,phone,city,do_not_contact,sequence_paused,last_touch_at,listing_discovery_key');const {propertyKey}=require('./pipeline-review-lib.cjs');
  const attributed=rows.filter(r=>representatives(r).length), unattributed=rows.filter(r=>!representatives(r).length);
  // Missing agents go to research in bulk, without paying for or starting research.
  for(let i=0;i<unattributed.length;i+=250){const payload=unattributed.slice(i,i+250).map(r=>({property_key:propertyKey(r),listing:{...r,_lane:'residential',_region:r.region,_run_id:'inventory-partner-refresh',_observed_at:r.lastseenat,_batch_id:null}}));
   const distinct=[...new Map(payload.map(r=>[r.property_key,r])).values()];const {error}=await db.from('partner_listing_research').upsert(distinct,{onConflict:'property_key'});if(error)throw Error(error.message);
  }
  for(let i=0;i<attributed.length;i+=100){const listings=attributed.slice(i,i+100);report.results.push(await sync({run_id:'inventory-partner-refresh-'+new Date().toISOString().slice(0,10),lane:'residential',region:'inventory',observed_at:new Date().toISOString(),listings},{db,contacts}));
   fs.writeFileSync(process.env.PARTNER_EVENT_REPORT||'/tmp/partner-inventory-refresh.json',JSON.stringify({...report,in_progress:true},null,2));
  }
 }

 const out=process.env.PARTNER_EVENT_REPORT||'/tmp/partner-inventory-refresh.json';fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={run};
