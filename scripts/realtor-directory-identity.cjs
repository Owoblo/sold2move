// Adapter for saved CSV exports from Downloads/realtors. No network or CRM writes.
// A directory identity is a research anchor, not proof that a property belongs to an agent.
function directoryIdentity(row){
 const id=String(row.individual_id||'').trim();if(!/^\d+$/.test(id)||!String(row.name||'').trim())return null;
 let profile=null;
 try{const url=new URL(row.profile_url);if(['www.realtor.ca','realtor.ca'].includes(url.hostname)&&url.protocol==='https:'&&new RegExp('^/agent/'+id+'(?:/|$)').test(url.pathname))profile=url.href;}catch{}
 return {source:'realtor_ca',source_agent_id:id,name:String(row.name).trim(),brokerage:row.brokerage||null,role:row.position||null,profile_url:profile,
  directory_phone:row.phone||null,alternate_phone_candidate:row.phone2||null,
  website:row.website||null,observed_at:row.collected_at_utc||null,
  individual_listing_status:'not_collected',brokerage_context_only:Boolean(row.brokerage_snapshot_listing_count),
  evidence_policy:'Match individual listings by source agent ID or explicit listing attribution; never by shared brokerage alone.'};
}
function directoryIdentities(rows){const ids=new Map();for(const row of rows){const value=directoryIdentity(row);if(!value)continue;const prior=ids.get(value.source_agent_id);if(!prior||(!prior.profile_url&&value.profile_url))ids.set(value.source_agent_id,value);}return [...ids.values()];}
module.exports={directoryIdentity,directoryIdentities};
