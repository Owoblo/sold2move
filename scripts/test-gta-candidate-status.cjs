const {test}=require('node:test');const assert=require('node:assert/strict');
const {statusDecision}=require('./gta-validate-candidates.cjs');
const observed='2026-08-18';
test('old sale and missing detail do not validate a current sale',()=>{assert.equal(statusDecision({homeStatus:'OFF_MARKET',priceHistory:[{event:'Sold',date:'2020-01-01'}]},observed).decision,'held');assert.equal(statusDecision(null,observed).decision,'held');});
test('active status overrides sale history',()=>assert.equal(statusDecision({homeStatus:'FOR_SALE',priceHistory:[{event:'Sold',date:'2026-09-01'}]},observed).decision,'excluded'));
test('recent dated sale or explicit current sold status validates',()=>{assert.equal(statusDecision({homeStatus:'OFF_MARKET',priceHistory:[{event:'Sold',date:'2026-09-01'}]},observed).decision,'verified_sold');assert.equal(statusDecision({homeStatus:'RECENTLY_SOLD'},observed).decision,'verified_sold');});
test('off market or pending alone is not sold',()=>{assert.equal(statusDecision({homeStatus:'OFF_MARKET'},observed).decision,'held');assert.equal(statusDecision({homeStatus:'PENDING'},observed).decision,'excluded');});
const {applyOutputFilters}=require('./postcard-step5-output.cjs');
test('two-event lifecycle allows sold after just-listed, blocks repeated sold and third send',()=>{
  const row={zpid:'test',status:'sold',addressstreet:'123 Example Street',market_segment:'owner_occupied',outreach_target:'homeowner',property_classified_at:'2026-08-18',is_furnished:true,_geocode_verified:true,just_listed_postcard_sent_at:'2026-08-19',postcard_send_count:1};
  assert.equal(applyOutputFilters([row],{}).finalListings.length,1);
  assert.equal(applyOutputFilters([{...row,sold_postcard_sent_at:'2026-09-01'}],{}).finalListings.length,0);
  assert.equal(applyOutputFilters([{...row,postcard_send_count:2}],{}).finalListings.length,0);
});
