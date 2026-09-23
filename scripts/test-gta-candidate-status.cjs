const {test}=require('node:test');const assert=require('node:assert/strict');
const {statusDecision}=require('./gta-validate-candidates.cjs');
const observed='2026-08-18';
test('old sale and missing detail do not validate a current sale',()=>{assert.equal(statusDecision({homeStatus:'OFF_MARKET',priceHistory:[{event:'Sold',date:'2020-01-01'}]},observed).decision,'held');assert.equal(statusDecision(null,observed).decision,'held');});
test('active status overrides sale history',()=>assert.equal(statusDecision({homeStatus:'FOR_SALE',priceHistory:[{event:'Sold',date:'2026-09-01'}]},observed).decision,'excluded'));
test('recent dated sale or explicit current sold status validates',()=>{assert.equal(statusDecision({homeStatus:'OFF_MARKET',priceHistory:[{event:'Sold',date:'2026-09-01'}]},observed).decision,'verified_sold');assert.equal(statusDecision({homeStatus:'RECENTLY_SOLD'},observed).decision,'verified_sold');});
test('off market or pending alone is not sold',()=>{assert.equal(statusDecision({homeStatus:'OFF_MARKET'},observed).decision,'held');assert.equal(statusDecision({homeStatus:'PENDING'},observed).decision,'excluded');});
