const {test}=require('node:test'),a=require('node:assert/strict');const {sync}=require('./partnership-listing-sync.cjs');
function mock(existing) {
 const writes=[];
 return {writes,from(table) {
  a.ok(['partner_listing_research','partner_listing_activity','market_contacts'].includes(table));
  return {
   select(){return this},eq(){return this},maybeSingle:async()=>({data:existing}),
   upsert:async data=>{writes.push({table,data});return {data:[]}},
   insert(data){writes.push({table,data});return {select(){return this},single:async()=>({data:{...data,id:'new-contact'}})}}
  };
 }};
}
const row={zpid:1,region:'windsor',addressstreet:'123 Main St',addresscity:'Windsor',addresszipcode:'N9A1A1',status:'sold',lastseenat:'2026-10-08T10:00:00Z',detailurl:'https://listing.example/1',listing_representatives:[{name:'Alex Smith',phone:'5195550100',role:'listing_agent'}]};
const payload={listings:[row],lane:'residential',region:'inventory',run_id:'test',observed_at:'2026-10-09T10:00:00Z'};
test('inventory refresh preserves printer evidence and source observation',async()=>{const db=mock({observed_at:'2026-10-07',postcard_batch_id:'printed-batch',postcard_status:'mailed'});await sync(payload,{db,contacts:[{id:'known',name:'Alex Smith',phone:'5195550100'}]});const r=db.writes.find(w=>w.table==='partner_listing_activity').data;a.equal(r.contact_id,'known');a.equal(r.postcard_status,'mailed');a.equal(r.postcard_batch_id,'printed-batch');a.equal(r.observed_at,row.lastseenat);a.equal(r.status_evidence,'inferred_first_disappearance');a.equal(db.writes[0].data.listing._region,'windsor')});
test('source backed new identities stay paused and no outreach tables touched',async()=>{const db=mock(null);await sync(payload,{db,contacts:[]});const c=db.writes.find(w=>w.table==='market_contacts').data;a.equal(c.sequence_paused,true);a.equal(c.stage,'target')});
test('research-only identity cannot automatically create a contact',async()=>{const db=mock(null);await sync({...payload,listings:[{...row,listing_representatives:[{...row.listing_representatives[0],provenance:'web_research_review'}]}]},{db,contacts:[]});a.equal(db.writes.filter(w=>w.table==='market_contacts').length,0)});
test('an explicitly reviewed person link survives a changed automatic match',async()=>{const db=mock({observed_at:'2026-10-07',match_status:'reviewed',contact_id:'human-confirmed'});await sync(payload,{db,contacts:[{id:'other',name:'Alex Smith',phone:'5195550100'}]});a.equal(db.writes.find(w=>w.table==='partner_listing_activity').data.contact_id,'human-confirmed')});
