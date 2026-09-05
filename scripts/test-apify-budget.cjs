const assert = require('node:assert/strict');
const { evaluateBudget, reserveForRegions, checkBudget } = require('./check-apify-budget.cjs');
const snapshot = (used, limit = 400) => ({ current: { monthlyUsageUsd: used }, limits: { maxMonthlyUsageUsd: limit }, monthlyUsageCycle: { endAt: '2026-09-29T23:59:59Z' } });
(async () => {
  assert.equal(evaluateBudget(snapshot(199.53), 9).allowed, false);
  assert.equal(evaluateBudget(snapshot(150), 38).allowed, true);
  assert.equal(evaluateBudget(snapshot(180), 20).allowed, true);
  assert.equal(evaluateBudget(snapshot(90, 100), 14).allowed, false);
  assert.equal(evaluateBudget(snapshot(150, 400), 60).allowed, false);
  assert.throws(() => evaluateBudget({ limits: { maxMonthlyUsageUsd: 200 } }, 10));
  assert.throws(() => evaluateBudget(snapshot('0'), 10));
  assert.throws(() => evaluateBudget(snapshot(0), NaN));
  assert.equal(reserveForRegions(['windsor', 'windsor']), 14);
  assert.equal(reserveForRegions(['windsor','chatham','sarnia','london','woodstock','wkg','ottawa']), 47);
  assert.throws(() => reserveForRegions(['typo']));
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.apify.com/v2/users/me/limits');
    assert.equal(options.method, undefined); // GET only; never start an actor or raise a limit.
    return { ok: true, json: async () => ({ data: snapshot(199.53) }) };
  };
  await assert.rejects(() => checkBudget(9, { token: 'test-token', fetchImpl }), /Insufficient Apify budget/);
  assert.equal(calls, 1);
  await assert.rejects(() => checkBudget(9, { token: 'test-token', fetchImpl: async () => ({ ok: false, status: 503 }) }), /lookup failed/);
  await assert.rejects(() => checkBudget(9, { token: '', fetchImpl }), /missing/);
  console.log('Budget boundary, lower account limit, missing data, and API failure tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
