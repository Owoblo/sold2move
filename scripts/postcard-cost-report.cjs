#!/usr/bin/env node
// Record exact run IDs at creation; read their reported charges without starting actors.
const fs = require('fs');
const path = require('path');
const COST_DIR = path.join(__dirname, '..', 'reports', 'apify-costs');
const terminal = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);
function startTracking(region, batchId) {
  fs.mkdirSync(COST_DIR, { recursive: true });
  const file = path.join(COST_DIR, `${String(batchId).replace(/[^a-zA-Z0-9_-]/g, '_')}.jsonl`);
  process.env.APIFY_COST_LEDGER = file;
  process.env.APIFY_COST_REGION = region;
  fs.appendFileSync(file, JSON.stringify({ region, batchId, kind: 'scope' }) + '\n');
  return file;
}
function recordRun(run, stage) {
  if (!process.env.APIFY_COST_LEDGER) startTracking('unknown', `standalone-${Date.now()}`);
  fs.appendFileSync(process.env.APIFY_COST_LEDGER, JSON.stringify({
    region: process.env.APIFY_COST_REGION, stage, id: run.id,
    actorId: run.actId, startedAt: run.startedAt,
  }) + '\n');
}
function summarize(records, runs) {
  const regions = {};
  const seen = new Set();
  const details = [];
  for (const record of records) {
    const row = regions[record.region] ||= { inventory: 0, details: 0, knownUsd: 0, pending: 0, failed: 0, runs: 0 };
    if (!record.id || seen.has(record.id)) continue;
    seen.add(record.id);
    const run = runs[record.id];
    const cost = run?.usageTotalUsd;
    const known = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0;
    const complete = known && terminal.has(run?.status);
    row.runs++;
    if (!complete) row.pending++;
    if (terminal.has(run?.status) && run.status !== 'SUCCEEDED') row.failed++;
    if (known) { row[record.stage] += cost; row.knownUsd += cost; }
    details.push({ ...record, status: run?.status || 'UNAVAILABLE', usageTotalUsd: known ? cost : null, complete });
  }
  return { currency: 'USD', generatedAt: new Date().toISOString(), regions, runs: details,
    knownTotalUsd: Object.values(regions).reduce((n, r) => n + r.knownUsd, 0),
    complete: Object.values(regions).every(r => r.pending === 0) };
}
async function getData(route, token, fetchImpl) {
  if (!token) throw new Error('APIFY_TOKEN missing');
  const response = await fetchImpl(`https://api.apify.com/v2/${route}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Apify reporting lookup HTTP ${response.status}`);
  return (await response.json()).data;
}
const money = n => `$${n.toFixed(2)}`;
function render(report) {
  const rows = Object.entries(report.regions).map(([region, r]) =>
    `| ${region} | ${money(r.inventory)} | ${money(r.details)} | ${money(r.knownUsd)}${r.pending ? ' (partial)' : ''} | ${r.failed} |`);
  return [
    '# Scrape costs (USD)', '',
    '| Area | Inventory | Detail fetching | Known total | Failed actor runs |',
    '| --- | ---: | ---: | ---: | ---: |', ...rows, '',
    `**${report.complete ? 'Total' : 'Known subtotal — charges incomplete'}: ${money(report.knownTotalUsd)}**`, '',
    report.account ? `Account billing-cycle usage: ${money(report.account.usedUsd)} (${report.account.startAt} through ${report.account.endAt}). This includes other account activity.` : 'Account billing-cycle usage: unavailable.', '',
    report.complete ? 'Costs are Apify-reported actor usage at report time, including charged failed attempts.' : 'Some charges are unavailable or still accruing; missing charges are not treated as zero.',
    'OpenAI, printing, postage, subscriptions, taxes, and separate storage/data-transfer charges are not included.',
    'A zero-run area reused saved data or did not start acquisition; it does not prove a successful scrape.', '',
  ].join('\n');
}
async function reportCosts({ files, token = process.env.APIFY_TOKEN, fetchImpl = fetch, email = false, outputDir = COST_DIR } = {}) {
  files ||= fs.existsSync(COST_DIR) ? fs.readdirSync(COST_DIR).filter(f => f.endsWith('.jsonl')).map(f => path.join(COST_DIR, f)) : [];
  const records = files.flatMap(file => fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)));
  if (!records.length) { console.log('No acquisition records available; no zero-cost claim made.'); return null; }
  const runs = {};
  for (const id of new Set(records.map(r => r.id).filter(Boolean))) {
    try { runs[id] = await getData(`actor-runs/${encodeURIComponent(id)}`, token, fetchImpl); }
    catch { console.warn(`Cost unavailable for actor run ${id}; marked incomplete.`); }
  }
  const report = summarize(records, runs);
  try {
    const data = await getData('users/me/limits', token, fetchImpl);
    if (typeof data?.current?.monthlyUsageUsd === 'number' && Number.isFinite(data.current.monthlyUsageUsd)) {
      report.account = { usedUsd: data.current.monthlyUsageUsd, startAt: data.monthlyUsageCycle?.startAt, endAt: data.monthlyUsageCycle?.endAt };
    }
  } catch { /* Reporting remains useful when account usage is unavailable. */ }
  const markdown = render(report);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'cost-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputDir, 'cost-report.md'), markdown);
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  if (email) {
    // Financial report goes to the owner, never to the printer.
    const { sendEmail } = require('./postcard-email-results.cjs');
    const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const areas = Object.keys(report.regions).join(', ');
    await sendEmail('business@starmovers.ca', `Scrape cost report: ${areas} — ${money(report.knownTotalUsd)}${report.complete ? '' : ' (partial)'}`, `<pre style="white-space:pre-wrap">${escaped}</pre>`, [
      { filename: 'scrape-costs.json', content: Buffer.from(JSON.stringify(report, null, 2)).toString('base64') },
    ]);
  }
  return report;
}
if (require.main === module) reportCosts({ email: process.argv.includes('--email') }).catch(error => {
  console.error('Cost reporting failed:', error.message); process.exitCode = 1;
});
module.exports = { startTracking, recordRun, summarize, render, reportCosts };
