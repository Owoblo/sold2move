const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildCoverage,propertyKind}=require('./partner-market-coverage.cjs');
const now='2026-10-10T00:00:00Z';
const rep=(name='Jane',brokerage='Office A')=>({name,brokerage,role:'listing_representative',phone:name==='Jane'?'4165550101':'4165550102',source_url:'https://example.com/listing'});
const row=(extra={})=>({lane:'residential',addressstreet:'1 Main Street',addresscity:'Toronto',region:'gta',status:'active',lastseenat:'2026-10-09T00:00:00Z',listing_representatives:[rep()],...extra});
const contacts=[{id:'jane',name:'Jane',phone:'4165550101',last_touch_at:now,last_inbound_at:now}];
test('co-agents and repeated source records count once in inventory and brokerage',()=>{
 const r=row({listing_representatives:[rep(),rep('Sam')]});const p=buildCoverage([r,r],contacts,[],now).partitions[0];
 assert.equal(p.counts.observed,1);assert.equal(p.counts.linked,1);assert.equal(p.brokerages[0].counts.observed,1);assert.equal(p.people.length,2);
});
test('different brokerages share credit without increasing denominator',()=>{
 const p=buildCoverage([row({listing_representatives:[rep(),rep('Sam','Office B')]})],contacts,[],now).partitions[0];
 assert.equal(p.counts.observed,1);assert.equal(p.brokerages.length,2);assert(p.brokerages.every(b=>b.counts.observed===1));
});
test('old active inventory retained but is stale; disappearance is not sale',()=>{
 const p=buildCoverage([row({lastseenat:'2026-01-01'}),row({addressstreet:'2 Main Street',status:'sold'})],contacts,[],now).partitions[0];
 assert.equal(p.counts.observed,2);assert.equal(p.counts.active,0);assert.equal(p.counts.stale,1);assert.equal(p.counts.confirmed_sales,0);
});
test('unattributed and postcard-excluded properties remain in denominator',()=>{
 const p=buildCoverage([row({listing_representatives:[],postcard_skip_reason:'vacant'})],contacts,[],now).partitions[0];
 assert.equal(p.counts.observed,1);assert.equal(p.counts.attributed,0);assert.equal(p.counts.postcard_excluded,1);
});
test('shared phone never establishes coverage',()=>{
 const p=buildCoverage([row()],contacts.concat({id:'sam',name:'Sam',phone:'4165550101'}),[],now).partitions[0];assert.equal(p.counts.linked,0);assert.equal(p.counts.reached,0);
});
test('unit and lane distinctions preserved; rental contact role is not inferred as realtor',()=>{
 const report=buildCoverage([row({lane:'rental',unit_label:'1',listing_representatives:[{...rep(),role:'landlord'}]}),row({lane:'rental',unit_label:'2'}),row()],[],[],now);
 assert.equal(report.partitions.reduce((n,p)=>n+p.counts.observed,0),3);assert(report.partitions.flatMap(p=>p.people).some(p=>p.role==='landlord'));
});
test('missing type stays unknown and explicit source type is classified',()=>{
 assert.equal(propertyKind({}),'unknown');assert.equal(propertyKind({homedata:{homeType:'SINGLE_FAMILY'}}),'house');assert.equal(propertyKind({property_type:'CONDO'}),'apartment_condo');
});
test('research candidates do not become attributed source evidence',()=>{
 const p=buildCoverage([row({listing_representatives:[{...rep(),provenance:'web_research_review'}]})],contacts,[],now).partitions[0];assert.equal(p.counts.attributed,0);
});
test('older inactive representative is not credited for a newer active listing',()=>{
 const p=buildCoverage([row({status:'sold',lastseenat:'2026-09-15',listing_representatives:[rep('Former')]}),row()],contacts,[],now).partitions[0];assert.equal(p.people.length,1);assert.equal(p.people[0].name,'Jane');
});
test('brokerage-only attribution credits brokerage without inventing an agent link',()=>{
 const p=buildCoverage([row({listing_representatives:[],brokername:'Office A'})],contacts,[],now).partitions[0];assert.equal(p.brokerages[0].counts.observed,1);assert.equal(p.counts.brokerage_attributed,1);assert.equal(p.counts.attributed,0);assert.equal(p.counts.linked,0);
});
