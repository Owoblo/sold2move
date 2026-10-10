#!/usr/bin/env node
// Uses saved inventory only: no acquisition, research spending, contact creation or outreach.
const fs=require('node:fs');
const {serviceClient}=require('./pipeline-review-lib.cjs');
const {buildCoverage}=require('./partner-market-coverage.cjs');
async function pages(db,table,select,order='id',filter=q=>q){
 const out=[];let after=null;
 for(;;){let q=filter(db.from(table).select(select)).order(order).limit(500);if(after!==null)q=q.gt(order,after);
  const {data,error}=await q;if(error)throw Error(table+': '+error.message);out.push(...data);if(data.length<500)return out;after=data.at(-1)[order];
 }
}
async function run({db=serviceClient(),apply=process.argv.includes('--apply')}={}){
 if(!db)throw Error('Database credentials required');
 const rows=[];const {REGION_CONFIG}=require('./postcard-region-config.cjs');
 for(const region of Object.keys(REGION_CONFIG))for(const status of ['active','just_listed','sold','sold_archived']){
  const page=await pages(db,'listings','zpid,region,city,addresscity,addressstreet,addressstate,addresszipcode,status,detailurl,first_seen_at,lastseenat,listing_representatives,listing_agent_names,brokername,postcard_skip_reason,homedata:hdpdata->homeInfo','zpid',q=>q.eq('region',region).eq('status',status));
  rows.push(...page.map(r=>({...r,city:r.addresscity||r.city,lane:'residential',status_evidence:['sold','sold_archived'].includes(r.status)?'inferred_first_disappearance':'source_reported'})));
 }
 for(const lane of ['rental','commercial']){
  const propertySelect=lane==='rental'?'id,street_address,city,province,postal_code,canonical_address,property_type,entity_type':'id,street_address,city,province,postal_code,canonical_address,asset_types';
  const props=new Map((await pages(db,lane+'_properties',propertySelect)).map(p=>[p.id,p]));
  const select=lane==='rental'?'id,rental_property_id,source,source_listing_id,source_url,source_address,unit_label,contact_name,contact_role,contact_company,contact_phone,contact_email,first_seen_at,last_seen_at,active,acquisition_scope,single_home,entity_type':'id,commercial_property_id,source,source_listing_id,source_url,unit_label,agent_name,agent_phone,agent_email,brokerage_name,first_seen_at,last_seen_at,active,acquisition_scope,asset_types,transaction_types';
  for(const r of await pages(db,lane+'_source_records',select)){
   const property=props.get(r[lane+'_property_id']);
   rows.push({...property,...r,lane,region:r.acquisition_scope||'unknown',property_type:property?.property_type,source_address:property?.street_address||r.source_address,status:r.active?'active':'removed'});
  }
 }
 const contacts=await pages(db,'market_contacts','id,name,company,phone,email,last_touch_at,last_inbound_at,do_not_contact');
 const reviewed=await pages(db,'partner_listing_activity','activity_key,lane,property_key,representative,contact_id,match_status','activity_key',q=>q.eq('match_status','reviewed'));
 const report=buildCoverage(rows,contacts,reviewed);
 // Publish only after every source has succeeded; a failed refresh leaves the prior snapshot intact.
 if(apply){const {error}=await db.from('partner_market_coverage_snapshots').upsert({id:report.generated_at.slice(0,10),generated_at:report.generated_at,report});if(error)throw Error(error.message);}
 fs.writeFileSync(process.env.PARTNER_COVERAGE_REPORT||'/tmp/partner-market-coverage.json',JSON.stringify(report));
 const totals={};for(const p of report.partitions)for(const [key,n]of Object.entries(p.counts))totals[key]=(totals[key]||0)+n;
 console.log(JSON.stringify({mode:apply?'apply':'preview',generated_at:report.generated_at,partitions:report.partitions.length,totals}));return report;
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={run,pages};
