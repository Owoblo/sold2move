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
