#!/usr/bin/env node
// Read-only preflight: never change billing limits or start paid actors here.
const MONTHLY_CEILING_USD = 200;
const REGION_RESERVES = Object.freeze({ windsor: 14, chatham: 3, sarnia: 3, london: 7, woodstock: 3, wkg: 8, ottawa: 9 });

function evaluateBudget(data, reserveUsd) {
  const used = data?.current?.monthlyUsageUsd;
  const accountLimit = data?.limits?.maxMonthlyUsageUsd;
  if (typeof used !== 'number' || !Number.isFinite(used) || used < 0 ||
      typeof accountLimit !== 'number' || !Number.isFinite(accountLimit) || accountLimit <= 0 ||
      !Number.isFinite(reserveUsd) || reserveUsd <= 0) {
    throw new Error('Cannot verify Apify budget; paid acquisition is blocked.');
  }
  const ceiling = Math.min(MONTHLY_CEILING_USD, accountLimit);
  const remaining = Math.max(0, ceiling - used);
  return { allowed: reserveUsd <= remaining, used, ceiling, remaining, reserveUsd,
    resetAfter: data.monthlyUsageCycle?.endAt || 'unknown' };
}

function reserveForRegions(regions) {
  if (!regions.length) throw new Error('At least one region is required');
  return [...new Set(regions)].reduce((sum, region) => {
    if (!REGION_RESERVES[region]) throw new Error(`Unknown budget region: ${region}`);
    return sum + REGION_RESERVES[region];
  }, 0);
}

async function checkBudget(reserveUsd, { token = process.env.APIFY_TOKEN, fetchImpl = fetch } = {}) {
  if (!token) throw new Error('APIFY_TOKEN missing; cannot verify budget.');
  const response = await fetchImpl('https://api.apify.com/v2/users/me/limits', {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Apify budget lookup failed (HTTP ${response.status}); paid acquisition is blocked.`);
  const { data } = await response.json();
  const result = evaluateBudget(data, reserveUsd);
  console.log(`Apify budget: $${result.used.toFixed(2)} used / $${result.ceiling.toFixed(2)} ceiling; $${result.remaining.toFixed(2)} remaining; $${reserveUsd.toFixed(2)} required before starting.`);
  if (!result.allowed) throw new Error(`Insufficient Apify budget. No paid acquisition started. Billing cycle ends ${result.resetAfter}. Reprint or reuse existing data instead.`);
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  Promise.resolve().then(() => {
    const reserve = args[0] === '--regions'
      ? reserveForRegions((args[1] || '').split(',').map(s => s.trim()).filter(Boolean))
      : args[0] === '--reserve' ? Number(args[1]) : NaN;
    if (!Number.isFinite(reserve) || reserve <= 0) throw new Error('Usage: check-apify-budget.cjs --regions windsor,chatham OR --reserve 20');
    return checkBudget(reserve);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { evaluateBudget, reserveForRegions, checkBudget };
