const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { buildMarketWorkbook } = require('./market-xlsx-report.cjs');

(async () => {
  const buffer = await buildMarketWorkbook('rental', [{
    source: 'zillow', source_listing_id: 'abc', city: 'Windsor',
    street_address: '1 Test St', province: 'ON', monthly_price: 2100,
    occupancy_state: 'furnished', classification_confidence: 0.91,
    classification_evidence: ['sofa and bed visible', 'advertised furnished'],
    listing_categories: ['rental', 'furnished'], source_url: 'https://example.com',
  }], [{ source: 'zillow', source_listing_id: 'abc', event_type: 'just_listed' }]);
  const workbook = await JSZip.loadAsync(buffer);
  const sheet = await workbook.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(sheet, /just_listed/);
  assert.match(sheet, /Rental Inventory|1 Test St/);
  assert.match(sheet, /furnished/);
  assert.match(sheet, /AI Evidence/);
  assert.ok(workbook.file('[Content_Types].xml'));

  const commercial = await buildMarketWorkbook('commercial', [
    { source: 'spacelist', source_listing_id: 'no-contact', city: 'Windsor' },
    { source: 'realtor_ca_commercial', source_listing_id: 'contact', city: 'London', agent_name: 'Jane Agent', agent_phone: '519-555-0100' },
  ]);
  const commercialZip = await JSZip.loadAsync(commercial);
  const commercialSheet = await commercialZip.file('xl/worksheets/sheet1.xml').async('string');
  assert.ok(commercialSheet.indexOf('Jane Agent') < commercialSheet.indexOf('no-contact'));
  assert.ok(commercialSheet.indexOf('Agent') < commercialSheet.indexOf('Address'));
  console.log('Market XLSX report tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
