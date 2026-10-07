const test = require('node:test');
const assert = require('node:assert/strict');
const { assertLiveDateWindow } = require('./postcard-pipeline.cjs');
const { regionIds } = require('./gta-pipeline-bridge.cjs');

test('late Toronto evening cannot silently exclude the new UTC-day scrape', () => {
  const now = new Date('2026-10-07T03:34:00Z');
  assert.throws(() => assertLiveDateWindow({from:'2026-09-23',to:'2026-10-06'}, now), /Include the UTC scrape date/);
  assert.doesNotThrow(() => assertLiveDateWindow({from:'2026-09-23',to:'2026-10-07'}, now));
  assert.doesNotThrow(() => assertLiveDateWindow({from:'2026-09-23',to:'2026-10-06',skipScrape:true}, now));
});

test('GTA ownership includes every status and every page after a timeout', async () => {
  const rows = Array.from({length:1203},(_,i)=>({zpid:String(i),status:i<501?'active':'sold_archived'}));
  let timeout = true;
  const db = {from() {
    const order=[];
    const q={select(){return q;},eq(k,v){assert.equal(k,'region');assert.equal(v,'toronto');return q;},
      order(k){order.push(k);return q;},async range(from,to){
        assert.deepEqual(order,['status','zpid']);
        if(timeout){timeout=false;return {error:{message:'canceling statement due to statement timeout'}};}
        return {data:rows.slice(from,to+1)};
      }};
    return q;
  }};
  const ids=await regionIds(db);
  assert.equal(ids.length,1203);
  assert.equal(new Set(ids).size,1203);
  assert.equal(ids.at(-1),'1202');
});
