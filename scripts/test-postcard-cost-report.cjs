const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { summarize, render, reportCosts } = require('./postcard-cost-report.cjs');
(async () => {
  const records = [
    { region: 'windsor', kind: 'scope' },
    { region: 'windsor', id: 'search1', stage: 'inventory' },
    { region: 'windsor', id: 'search1', stage: 'inventory' }, // no double charge
    { region: 'windsor', id: 'detail1', stage: 'details' },
    { region: 'ottawa', id: 'search2', stage: 'inventory' },
    { region: 'chatham', kind: 'scope' }, // reused data
  ];
  const runs = {
    search1: { status: 'SUCCEEDED', usageTotalUsd: 10.75 },
    detail1: { status: 'FAILED', usageTotalUsd: 0.12 },
    search2: { status: 'SUCCEEDED', usageTotalUsd: 5.70 },
  };
  const report = summarize(records, runs);
  assert.equal(report.knownTotalUsd, 16.57);
  assert.equal(report.regions.windsor.runs, 2);
  assert.equal(report.regions.windsor.failed, 1);
  assert.equal(report.regions.windsor.details, 0.12);
  assert.equal(report.regions.chatham.knownUsd, 0);
  assert.equal(report.complete, true);
  for (const missing of [undefined, null, NaN, '5.70', -1]) {
    const partial = summarize(records, { ...runs, search2: { status: 'SUCCEEDED', usageTotalUsd: missing } });
    assert.equal(partial.complete, false);
    assert.equal(partial.regions.ottawa.pending, 1);
    assert.match(render(partial), /charges incomplete/);
  }
  assert.equal(summarize(records, { ...runs, search2: { status: 'RUNNING', usageTotalUsd: 1 } }).complete, false);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'postcard-cost-test-'));
  const ledger = path.join(temp, 'runs.jsonl');
  fs.writeFileSync(ledger, records.map(r => JSON.stringify(r)).join('\n'));
  const calls = [];
  const fakeFetch = async (url, options) => {
    assert.equal(options.method, undefined); // GET only; cannot start actors
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    calls.push(url);
    const id = url.split('/').pop();
    return { ok: true, json: async () => ({ data: id === 'limits'
      ? { current: { monthlyUsageUsd: 199.53 }, monthlyUsageCycle: { startAt: '2026-08-31', endAt: '2026-09-29' } }
      : runs[id] }) };
  };
  const emailer = require('./postcard-email-results.cjs');
  const originalSend = emailer.sendEmail;
  let sent;
  emailer.sendEmail = async (...args) => { sent = args; };
  try {
    const actual = await reportCosts({ files: [ledger], outputDir: temp, token: 'test-token', fetchImpl: fakeFetch, email: true });
    assert.equal(actual.knownTotalUsd, 16.57);
    assert.equal(actual.account.usedUsd, 199.53);
    assert.equal(calls.filter(url => url.includes('search1')).length, 1);
    assert.equal(sent[0], 'business@starmovers.ca');
    assert.match(sent[1], /\$16.57/);
    assert.equal(sent[3][0].filename, 'scrape-costs.json');
    const unavailable = await reportCosts({ files: [ledger], outputDir: temp, token: 'test-token', fetchImpl: async () => ({ ok: false, status: 503 }) });
    assert.equal(unavailable.complete, false);
    assert.equal(unavailable.account, undefined);
  } finally { emailer.sendEmail = originalSend; }
  console.log('Postcard cost reporting tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
