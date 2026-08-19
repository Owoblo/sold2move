#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const { buildMarketWorkbook, recordsForEvents } = require('./market-xlsx-report.cjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function send(body) {
  return new Promise((resolve, reject) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return reject(new Error('RESEND_API_KEY not set'));
    const payload = JSON.stringify(body);
    const request = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => response.statusCode >= 200 && response.statusCode < 300
        ? resolve(JSON.parse(data)) : reject(new Error(`Resend ${response.statusCode}: ${data}`)));
    });
    request.on('error', reject);
    request.end(payload);
  });
}
const titleCase = value => String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const tableRows = values => Object.entries(values).map(([label, value]) =>
  `<tr><td style="padding:8px 12px;border:1px solid #dbe3ea">${titleCase(label)}</td><td style="padding:8px 12px;border:1px solid #dbe3ea;text-align:right"><b>${value}</b></td></tr>`
).join('');
const eventIsTerminal = event => ['leased_or_withdrawn', 'sold_or_withdrawn', 'sold_leased_or_withdrawn', 'off_market_unknown'].includes(event.event_type);

async function main() {
  const lane = process.argv[2];
  const runDir = process.argv[3];
  if (!['rental', 'commercial'].includes(lane) || !runDir) throw new Error('Usage: market-email-results.cjs rental|commercial RUN_DIR');
  const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'summary.json'), 'utf8'));
  const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json'), 'utf8'));
  const inventoryFile = lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json';
  const inventory = JSON.parse(fs.readFileSync(path.join(runDir, inventoryFile), 'utf8'));
  const relocationPath = lane === 'commercial' ? path.join(runDir, 'relocation-candidates.json') : null;
  const relocationCandidates = relocationPath && fs.existsSync(relocationPath)
    ? JSON.parse(fs.readFileSync(relocationPath, 'utf8')) : [];
  const reviewQueuePath = lane === 'commercial' ? path.join(runDir, 'relocation-review-queue.csv') : null;
  const postcardDir = path.join(runDir, 'postcard-output');
  const postcardSummaryPath = path.join(postcardDir, 'summary.json');
  const postcardSummary = fs.existsSync(postcardSummaryPath)
    ? JSON.parse(fs.readFileSync(postcardSummaryPath, 'utf8')) : { mail_eligible: 0 };
  const postcardAttachments = fs.existsSync(postcardDir) ? fs.readdirSync(postcardDir)
    .filter(name => /mail-eligible-.+\.(csv|pdf)$/.test(name))
    .map(name => ({ filename: name, content: fs.readFileSync(path.join(postcardDir, name)).toString('base64') })) : [];
  const aiPath = path.join(runDir, 'ai-classification-summary.json');
  const ai = fs.existsSync(aiPath) ? JSON.parse(fs.readFileSync(aiPath, 'utf8')) : { counts: {} };
  const date = new Date().toISOString().slice(0, 10);
  const label = lane === 'rental' ? 'Rental' : 'Commercial';
  const fullWorkbook = await buildMarketWorkbook(lane, inventory, lifecycle.events || [], summary.cities || []);
  const contacts = lane === 'rental'
    ? { 'Contact names': inventory.filter(row => row.contact_name).length, 'Phone numbers': inventory.filter(row => row.contact_phone).length, Companies: inventory.filter(row => row.contact_company).length }
    : { 'Agent names': inventory.filter(row => row.agent_name).length, 'Phone numbers': inventory.filter(row => row.agent_phone).length, Brokerages: inventory.filter(row => row.brokerage_name).length };
  const cities = inventory.reduce((counts, row) => { counts[row.city || 'Unknown'] = (counts[row.city || 'Unknown'] || 0) + 1; return counts; }, {});
  const cityTop = Object.fromEntries(Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 12));
  const regionCoverage = Object.fromEntries((summary.regions || []).map(region => [
    region.label || region.region,
    `${region.source_records ?? (region.spacelist_records || 0) + (region.realtor_records || 0)} records / ${region.requested_cities} requested places`,
  ]));
  const health = {
    'Source records': inventory.length,
    'Photo coverage': `${Math.round(100 * inventory.filter(row => row.photo_urls?.length).length / Math.max(1, inventory.length))}%`,
    'AI classified this run': ai.classified || 0,
    'AI classification failures': ai.failed || 0,
    'AI quota available': ai.quota_blocked ? 'NO — classifications left unknown' : 'yes',
  };
  await send({
    from: process.env.MARKET_EMAIL_FROM || 'Sold2Move Market Radar <postcards@sold2move.com>',
    to: [process.env.MARKET_REPORT_EMAIL || 'business@starmovers.ca'], reply_to: 'business@starmovers.ca',
    subject: `${label} Full Scrape — Just Listed + Lifecycle — ${date}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:760px;color:#17324d"><h2>${label} Market Radar — Full Scrape</h2><p>This is the complete inventory delivery. A disappearance becomes reportable only after two successful misses; it does not prove a lease or sale.</p><p><strong>Qualified direct-mail pieces: ${postcardSummary.mail_eligible || 0}</strong>. First-run market baselines and uncertain records are held automatically.</p>${lane === 'commercial' ? `<p><strong>Direct relocation candidates requiring human review: ${relocationCandidates.length}</strong>. Generic property listings remain market intelligence only.</p>` : ''}<h3>Lifecycle</h3><table style="border-collapse:collapse">${tableRows(lifecycle.summary || {})}</table><h3>Acquisition coverage</h3><table style="border-collapse:collapse">${tableRows(regionCoverage)}</table><p>Every requested city and community—including zero-result and failed searches—is listed in the workbook’s <b>Market Coverage</b> sheet. Absence is never silently hidden.</p><h3>AI occupancy / furnishing</h3><table style="border-collapse:collapse">${tableRows(ai.counts || {})}</table><h3>Contact coverage</h3><table style="border-collapse:collapse">${tableRows(contacts)}</table><h3>Health checks</h3><table style="border-collapse:collapse">${tableRows(health)}</table><h3>Largest returned city inventories</h3><table style="border-collapse:collapse">${tableRows(cityTop)}</table><p style="color:#52697d">The attached XLSX includes lifecycle, occupancy/furnishing state, AI confidence, evidence, contacts, source URLs, listing details and the complete requested-city coverage ledger.</p></div>`,
    attachments: [{ filename: `${lane}-full-market-report-${date}.xlsx`, content: fullWorkbook.toString('base64') }, ...postcardAttachments, ...(lane === 'commercial' ? [{
      filename: `commercial-relocation-candidates-${new Date().toISOString().slice(0, 10)}.json`,
      content: Buffer.from(JSON.stringify(relocationCandidates, null, 2)).toString('base64'),
    }, ...(reviewQueuePath && fs.existsSync(reviewQueuePath) ? [{
      filename: `commercial-relocation-review-${new Date().toISOString().slice(0, 10)}.csv`,
      content: fs.readFileSync(reviewQueuePath).toString('base64'),
    }] : [])] : [])],
  });

  const terminal = (lifecycle.events || []).filter(eventIsTerminal);
  if (terminal.length) {
    const terminalWorkbook = await buildMarketWorkbook(lane, recordsForEvents(terminal), terminal);
    await send({
      from: process.env.MARKET_EMAIL_FROM || 'Sold2Move Market Radar <postcards@sold2move.com>',
      to: [process.env.MARKET_REPORT_EMAIL || 'business@starmovers.ca'], reply_to: 'business@starmovers.ca',
      subject: `${label} Confirmed Off-Market Candidates — ${terminal.length} — ${date}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:700px;color:#17324d"><h2>${label} Off-Market Action List</h2><p>${terminal.length} listing(s) were absent in two consecutive successful source scrapes. For rentals this means leased or withdrawn; for commercial listings it means sold, leased, or withdrawn according to the listing transaction type. Verify before outreach.</p><table style="border-collapse:collapse">${tableRows(terminal.reduce((counts, event) => { counts[event.event_type] = (counts[event.event_type] || 0) + 1; return counts; }, {}))}</table></div>`,
      attachments: [{ filename: `${lane}-off-market-candidates-${date}.xlsx`, content: terminalWorkbook.toString('base64') }],
    });
  }
  console.log(`Sent ${lane} full report${terminal.length ? ` and ${terminal.length}-row off-market report` : '; no terminal events, so no action email'}`);
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
