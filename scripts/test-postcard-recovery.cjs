const test = require('node:test');
const assert = require('node:assert/strict');
const { assertLiveDateWindow } = require('./postcard-pipeline.cjs');
const { regionIds } = require('./gta-pipeline-bridge.cjs');
const { extractPhotosFromApify, extractDetailFreshness } = require('./postcard-step2-photos.cjs');
const { normalizeForUpsert, assertCompleteSearchLog } = require('./postcard-step0-scrape.cjs');

test('fractional GTA badge ages fit integer columns without making missing ages fresh', () => {
  assert.equal(normalizeForUpsert({search_days_on_zillow:5/24}).search_days_on_zillow,0);
  assert.equal(normalizeForUpsert({search_days_on_zillow:null}).search_days_on_zillow,null);
  assert.equal(normalizeForUpsert({search_days_on_zillow:-1}).search_days_on_zillow,null);
  assert.equal(normalizeForUpsert({status:'sold'}).search_days_on_zillow,undefined);
  assert.equal(extractDetailFreshness({daysOnZillow:5/24}).detail_days_on_zillow,0);
});

test('billing-truncated success cannot mutate inventory or infer sold listings', () => {
  assert.throws(()=>assertCompleteSearchLog('Scraped 34 new items (limited to 13 items due to results limit)','sarnia'),/truncated inventory/);
  assert.doesNotThrow(()=>assertCompleteSearchLog('ACTOR: LIMITED_PERMISSIONS. Finished! 177 succeeded, 0 failed.'));
});

test('current actor detail photos reach classification, excluding Street View placeholders', () => {
  const photos=extractPhotosFromApify({listingPhotos:[
    {url:'https://photos.zillowstatic.com/fp/interior.jpg'},
    {src:'https://photos.zillowstatic.com/fp/kitchen.jpg'},
    {url:'https://maps.googleapis.com/maps/api/streetview?location=test'},
  ]});
  assert.equal(photos.length,2);
  assert.ok(photos.every(p=>p.url.includes('zillowstatic.com')));
});

test('missing or invalid listing age never becomes a zero-day fresh listing', () => {
  for (const days of [null,undefined,'',-1,'unknown']) {
    assert.equal(extractDetailFreshness({daysOnZillow:days}).detail_days_on_zillow,null);
  }
  assert.equal(extractDetailFreshness({daysOnZillow:0}).detail_days_on_zillow,0);
  assert.equal(extractDetailFreshness({daysOnZillow:'12'}).detail_days_on_zillow,12);
});

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
