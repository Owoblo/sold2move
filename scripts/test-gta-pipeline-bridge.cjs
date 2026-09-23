const {test}=require('node:test'),assert=require('node:assert/strict');const {makePlan}=require('./gta-pipeline-bridge.cjs');
const now='2026-09-23T17:40:59.298Z';const row=(zpid,street)=>({zpid,addressstreet:street,addresszipcode:'M5V2T6',city:'Toronto',region:'toronto',first_seen_at:now,last_seen_at:now,lastseenat:now});
test('baseline seeds existing inventory without triggering either mailing event',()=>{const r=makePlan([row('1','10 Main St'),row('2','20 Main St')],[{...row('1','10 Main St'),region:'Ontario, Canada',status:'sold_archived',postcard_send_count:1,just_listed_postcard_sent_at:now}],now,true);assert.equal(r.inserts[0].status,'active');assert.equal(r.updates[0].status,'active');assert.equal(r.statusUpdates.length,0);assert.equal('postcard_send_count' in r.updates[0],false);assert.equal('just_listed_postcard_sent_at' in r.updates[0],false);});
test('normal changes use existing just-listed and disappearance lifecycle',()=>{const r=makePlan([row('2','20 Main St')],[{...row('1','10 Main St'),status:'active'}],now,false);assert.equal(r.inserts[0].status,'just_listed');assert.equal(r.statusUpdates[0].status,'sold');});
test('listings owned by another region cannot be reassigned or inferred sold',()=>{const r=makePlan([row('1','10 Main St')],[{...row('1','10 Main St'),region:'wkg',status:'active'}],now,false);assert.equal(r.inserts.length+r.updates.length+r.statusUpdates.length,0);assert.deepEqual(r.protectedIds,['1']);});
test('changed listing ID at the same known address is not newly listed',()=>{const r=makePlan([row('2','10 Main St')],[{...row('1','10 Main St'),status:'active'}],now,false);assert.equal(r.inserts[0].status,'active');assert.equal(r.statusUpdates.length,0);});

test('missing connection marker is distinct from an unreadable existing marker',async()=>{
 const {readOptional}=require('./gta-pipeline-bridge.cjs');assert.equal(await readOptional({list:async()=>({data:[]})},'pipeline/state.json'),null);
 await assert.rejects(readOptional({list:async()=>({data:[{name:'state.json'}]}),download:async()=>({error:{message:'access denied'}})},'pipeline/state.json'),/existing/);
});

test('baseline photo qualification is retained when the next scrape first misses a property',()=>{
 const cache=[{zpid:'1',classification:{market_segment:'owner_occupied',occupancy_state:'furnished',outreach_target:'homeowner',confidence:0.95}}];
 const r=makePlan([],[{...row('1','10 Main St'),status:'active'}],now,false,cache);
 assert.equal(r.statusUpdates[0].status,'sold');assert.equal(r.statusUpdates[0].is_furnished,true);assert.equal(r.statusUpdates[0].outreach_target,'homeowner');
});

test('a still-observed ID cannot become sold merely because address normalization failed',()=>{
 const r=makePlan([],[{...row('1','10 Main St'),status:'active'}],now,false,[],new Set(['1']));assert.equal(r.statusUpdates.length,0);assert.equal(r.summary.soldCount,0);
});
test('canonical census address supports both current and older raw actor schemas',()=>{
 const {prepareRows}=require('./gta-pipeline-bridge.cjs');const snapshot={collected_at:now,inventory:[{zpid:'1',municipality:'Toronto',last_seen_at:now,data:{street:'10 Main St',state:'ON',postal_code:'M5V2T6',days_on_zillow:2}}]};
 const result=prepareRows(snapshot,[{zpid:'1',address:{streetAddress:'10 Main St',city:'Toronto',state:'ON',zipcode:'M5V2T6'}}]);assert.equal(result.rows.length,1);assert.equal(result.rows[0].addressstreet,'10 Main St');
});
