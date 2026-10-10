// Read-only analysis. A match here never grants outreach permission or creates a CRM record.
const {propertyKey,digest}=require('./pipeline-review-lib.cjs');
const {representatives}=require('./partnership-listing-sync.cjs');
const {matchContact,nameKey}=require('./partner-identity.cjs');
const normalize=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const fields=['observed','active','stale','removed','confirmed_sales','attributed','brokerage_attributed','linked','reached','replied','suppressed','postcard_excluded','newly_observed'];
const counts=()=>Object.fromEntries(fields.map(k=>[k,0]));
function propertyKind(row){
 const raw=String(row.property_type||row.homedata?.homeType||row.asset_types?.[0]||'').toLowerCase().replace(/[_-]/g,' ');
 if(/single family|detached|townhouse|townhome|multi family|house/.test(raw)||row.single_home===true)return 'house';
 if(/condo|apartment/.test(raw))return 'apartment_condo';
 if(/land|lot/.test(raw))return 'land';
 if(raw)return normalize(raw).replaceAll(' ','_');
 return row.entity_type==='room'?'room':'unknown';
}
function buildCoverage(rows,contacts,activities=[],now=new Date().toISOString()){
 const nowMs=Date.parse(now), day=86400000, recent=nowMs-30*day, fresh=nowMs-21*day;
 const contactMap=new Map(contacts.map(c=>[c.id,c]));
 const reviewed=new Map();
 for(const a of activities)if(a.match_status==='reviewed'&&contactMap.has(a.contact_id)){
  const k=[a.lane,a.property_key,nameKey(a.representative?.name),normalize(a.representative?.brokerage)].join('|');
  const ids=reviewed.get(k)||new Set();ids.add(a.contact_id);reviewed.set(k,ids);
 }
 const properties=new Map();
 for(const r of rows){
  const key=r.lane+'|'+propertyKey(r), observed=r.lastseenat||r.last_seen_at;
  const stamp=Date.parse(observed), active=r.active??['active','just_listed','available'].includes(r.status);
  if(!active&&(!Number.isFinite(stamp)||stamp<recent))continue;
  const current=properties.get(key);
  if(!current)properties.set(key,{row:r,records:[r]});
  else {current.records.push(r);if(stamp>Date.parse(current.row.lastseenat||current.row.last_seen_at||''))current.row=r;}
 }
 const partitions=new Map();
 for(const {row:r,records} of properties.values()){
  const lane=r.lane, key=propertyKey(r), city=r.city||r.addresscity||'Unknown', region=r.region||r.acquisition_scope||'unknown';
  const kind=propertyKind(r), facetKey=JSON.stringify([normalize(city),region,lane,kind]);
  const p=partitions.get(facetKey)||{city,region,lane,kind,counts:counts(),people:new Map(),brokerages:new Map(),latest_observation:null};
  const stamp=Date.parse(r.lastseenat||r.last_seen_at||''), storedActive=r.active??['active','just_listed','available'].includes(r.status);
  const isFresh=Number.isFinite(stamp)&&stamp>=fresh&&stamp<=nowMs+day;
  const flags={...counts(),observed:1,active:Number(storedActive&&isFresh),stale:Number(!isFresh),removed:Number(!storedActive),confirmed_sales:Number(r.status_evidence==='confirmed_sale'),postcard_excluded:Number(Boolean(r.postcard_skip_reason)),newly_observed:Number(Date.parse(r.first_seen_at)>=recent&&Date.parse(r.first_seen_at)<=nowMs)};
  if(Number.isFinite(stamp)&&(!p.latest_observation||stamp>Date.parse(p.latest_observation)))p.latest_observation=new Date(stamp).toISOString();
  const people=new Map(), brokers=new Map();
  for(const record of records){
   const recordStamp=Date.parse(record.lastseenat||record.last_seen_at||'');
   const recordActive=record.active??['active','just_listed','available'].includes(record.status);
   if(recordActive!==storedActive||(isFresh&&(!Number.isFinite(recordStamp)||recordStamp<fresh)))continue;
   const reportedBroker=record.brokername||record.brokerage_name;
   if(reportedBroker&&!brokers.has(normalize(reportedBroker)))brokers.set(normalize(reportedBroker),{key:normalize(reportedBroker),name:reportedBroker,counts:{...flags,brokerage_attributed:1},people:new Set()});
   // Keep different people and roles; a rental contact is not assumed to be a realtor.
   for(const rep of representatives(record)){
    if(!rep.source_url||rep.provenance==='web_research_review')continue;
    const review=reviewed.get([lane,key,nameKey(rep.name),normalize(rep.brokerage)].join('|'));
    const match=review?.size===1?{contact:contactMap.get([...review][0]),status:'reviewed'}:matchContact(rep,contacts);
    const c=review?.size>1?null:match.contact;
    const actorKey=c?'contact:'+c.id:'candidate:'+digest([nameKey(rep.name),normalize(rep.brokerage),normalize(rep.role),rep.phone||'',rep.email||'']);
    const person=people.get(actorKey)||{key:actorKey,name:c?.name||rep.name,contact_id:c?.id||null,identity:c?'linked':'unverified',role:rep.role||'unknown',brokerage:rep.brokerage||null,counts:counts(),samples:[]};
    person.counts={...flags,attributed:1,linked:Number(Boolean(c)),reached:Number(Boolean(c?.last_touch_at)),replied:Number(Boolean(c?.last_inbound_at)),suppressed:Number(Boolean(c?.do_not_contact))};
    if(person.samples.length<3)person.samples.push({address:r.addressstreet||r.street_address||r.source_address||r.canonical_address||'Address unavailable',url:rep.source_url});
    people.set(actorKey,person);
    if(rep.brokerage){const bk=normalize(rep.brokerage);const b=brokers.get(bk)||{key:bk,name:rep.brokerage,counts:{...flags,attributed:1},people:new Set()};b.people.add(actorKey);for(const f of ['linked','reached','replied','suppressed'])b.counts[f]=Math.max(b.counts[f],person.counts[f]);brokers.set(bk,b);}
   }
  }
  flags.attributed=Number(people.size>0);
  flags.brokerage_attributed=Number(brokers.size>0);
  for(const f of ['linked','reached','replied','suppressed'])flags[f]=Number([...people.values()].some(x=>x.counts[f]));
  for(const f of fields)p.counts[f]+=flags[f];
  for(const person of people.values()){
   const prior=p.people.get(person.key);if(!prior)p.people.set(person.key,person);else {for(const f of fields)prior.counts[f]+=person.counts[f];prior.samples=[...prior.samples,...person.samples].slice(0,3);}
  }
  for(const b of brokers.values()){const prior=p.brokerages.get(b.key);if(!prior)p.brokerages.set(b.key,b);else {for(const f of fields)prior.counts[f]+=b.counts[f];for(const id of b.people)prior.people.add(id);}}
  partitions.set(facetKey,p);
 }
 return {version:1,generated_at:now,freshness_days:21,recent_days:30,scope:'All stored active inventory in configured residential regions, plus rental and commercial source records; inactive records observed within 30 days. Counts are unique property/unit per lane, not whole-market share.',partitions:[...partitions.values()].map(p=>({...p,people:[...p.people.values()],brokerages:[...p.brokerages.values()].map(b=>({...b,people:[...b.people]}))}))};
}
module.exports={buildCoverage,propertyKind,normalize,fields};
