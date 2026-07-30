const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { buildMarketWorkbook } = require('./market-xlsx-report.cjs');

(async () => {
  const buffer = await buildMarketWorkbook('rental', [{
    source: 'zillow', source_listing_id: 'abc', city: 'Windsor',
    street_address: '1 Test St', province: 'ON', monthly_price: 2100,
    listing_categories: ['rental', 'furnished'], source_url: 'https://example.com',
  }], [{ source: 'zillow', source_listing_id: 'abc', event_type: 'just_listed' }]);
  const workbook = await JSZip.loadAsync(buffer);
  const sheet = await workbook.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(sheet, /just_listed/);
  assert.match(sheet, /Rental Inventory|1 Test St/);
  assert.ok(workbook.file('[Content_Types].xml'));
  console.log('Market XLSX report tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
