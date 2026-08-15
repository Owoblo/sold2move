#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function send(body) {
  return new Promise((resolve, reject) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return reject(new Error('RESEND_API_KEY not set'));
    const payload = JSON.stringify(body);
    const request = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
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

async function main() {
  const lane = process.argv[2];
  const runDir = process.argv[3];
  if (!['rental', 'commercial'].includes(lane) || !runDir) {
    throw new Error('Usage: market-email-results.cjs rental|commercial RUN_DIR');
  }
  const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'summary.json'), 'utf8'));
  const lifecyclePath = path.join(runDir, 'lifecycle-summary.json');
  const lifecycle = fs.existsSync(lifecyclePath)
    ? JSON.parse(fs.readFileSync(lifecyclePath, 'utf8')) : { summary: { baseline_inventory: summary.totals?.canonical_properties || 0 } };
  const inventoryFile = lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json';
  const inventory = fs.readFileSync(path.join(runDir, inventoryFile));
  const relocationPath = lane === 'commercial' ? path.join(runDir, 'relocation-candidates.json') : null;
  const relocationCandidates = relocationPath && fs.existsSync(relocationPath)
    ? JSON.parse(fs.readFileSync(relocationPath, 'utf8')) : [];
  const reviewQueuePath = lane === 'commercial' ? path.join(runDir, 'relocation-review-queue.csv') : null;
  const rows = Object.entries(lifecycle.summary || {}).map(([label, value]) =>
    `<tr><td style="padding:8px;border:1px solid #ddd">${label.replaceAll('_', ' ')}</td><td style="padding:8px;border:1px solid #ddd">${value}</td></tr>`
  ).join('');
  await send({
    from: process.env.MARKET_EMAIL_FROM || 'Sold2Move Market Radar <postcards@sold2move.com>',
    to: [process.env.MARKET_REPORT_EMAIL || 'business@starmovers.ca'],
    reply_to: 'business@starmovers.ca',
    subject: `${lane === 'rental' ? 'Rental' : 'Commercial'} market scrape — ${new Date().toISOString().slice(0, 10)}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:700px"><h2>${lane} market radar</h2><p>The scrape, categorization and lifecycle comparison completed. Disappearances are inferred and require two successful misses.</p>${lane === 'commercial' ? `<p><strong>Direct relocation candidates requiring human review: ${relocationCandidates.length}</strong>. Generic property listings remain market intelligence only.</p>` : ''}<table style="border-collapse:collapse">${rows}</table></div>`,
    attachments: [{
      filename: `${lane}-inventory-${new Date().toISOString().slice(0, 10)}.json`,
      content: inventory.toString('base64'),
    }, ...(lane === 'commercial' ? [{
      filename: `commercial-relocation-candidates-${new Date().toISOString().slice(0, 10)}.json`,
      content: Buffer.from(JSON.stringify(relocationCandidates, null, 2)).toString('base64'),
    }, ...(reviewQueuePath && fs.existsSync(reviewQueuePath) ? [{
      filename: `commercial-relocation-review-${new Date().toISOString().slice(0, 10)}.csv`,
      content: fs.readFileSync(reviewQueuePath).toString('base64'),
    }] : [])] : [])],
  });
  console.log(`Sent ${lane} market report`);
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
