const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PDFDocument } = require('pdf-lib');
const Papa = require('papaparse');
const { query } = require('./market-db.cjs');
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const printer = 'loonieprints@gmail.com';

async function dispatch(lane, runDir, { db = query, fetchImpl = fetch } = {}) {
  if (!['rental','commercial'].includes(lane)) throw new Error('Invalid market lane');
  const folder = fs.readFileSync(path.join(runDir,'current-postcard-output.txt'),'utf8').trim();
  if (!['postcards','postcards-supplement'].includes(folder)) throw new Error('Invalid output pointer');
  const dir = path.join(runDir,folder), manifestFile = path.join(dir,`${lane}-batch.json`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  require(`./${lane}-artwork.cjs`).validateManifest(manifest);
  if (!/^[a-zA-Z0-9_.:-]+$/.test(manifest.batch_id)) throw new Error('Invalid batch ID');
  if (!manifest.recipients.length) { console.log('No qualified recipients; no print email.'); return { skipped: true }; }
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY required');
  const label = lane === 'rental' ? 'Rental' : 'Commercial';
  const csvName = `${lane}-recipients.csv`, csvBytes = fs.readFileSync(path.join(dir,csvName));
  const csv = Papa.parse(csvBytes.toString(),{header:true,skipEmptyLines:true});
  if (csv.errors.length || csv.data.length !== manifest.recipients.length || csv.data.some((row,i) =>
    Object.entries(manifest.recipients[i]).some(([key,value]) => row[key] !== String(value ?? '')))) throw new Error('Print CSV differs from saved recipients');
  const attachments = [];
  for (const region of [...new Set(manifest.recipients.map(r => r.region))].sort()) {
    const filename = `${label}_${region}_${manifest.batch_id}.pdf`;
    const bytes = fs.readFileSync(path.join(dir,filename));
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() !== manifest.recipients.filter(r => r.region === region).length) throw new Error('Print PDF page count mismatch');
    attachments.push({filename,content:bytes.toString('base64')});
  }
  attachments.push({filename:csvName,content:csvBytes.toString('base64')});
  const body = {from:'Saturn Star Services <postcards@sold2move.com>',to:[printer],reply_to:'business@starmovers.ca',
    subject:`Print Request: ${label} — ${manifest.batch_id} (${manifest.recipients.length} pieces)`,
    text:`Please print the attached regional artwork for ${manifest.recipients.length} qualified ${lane} recipients. Print at actual size (100%). The CSV is the recipient list, not an additional print piece. Batch: ${manifest.batch_id}. One piece per recipient.`,attachments};
  const payload = JSON.stringify(body), hash = crypto.createHash('sha256').update(payload).digest('hex');
  const result = await db(`SELECT public.claim_market_print_dispatch(${quote(lane)},${quote(manifest.batch_id)},${quote(printer)},${quote(hash)},${quote(JSON.stringify(manifest.recipients))}::jsonb) AS receipt`);
  const claim = result[0]?.receipt;
  if (!claim) throw new Error('Print claim missing');
  const save = receipt => {
    fs.writeFileSync(path.join(runDir,'market-print-receipt.json'),JSON.stringify(receipt,null,2));
    fs.writeFileSync(manifestFile,JSON.stringify({...manifest,delivery_status:'submitted',print_recipient:receipt.recipient,print_provider_id:receipt.provider_id,submitted_at:receipt.submitted_at},null,2));
  };
  if (claim.submitted_at) { save(claim); console.log('Print batch already submitted; no duplicate email.'); return claim; }
  const response = await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`market-print-${lane}-${manifest.batch_id}`},body:payload,signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`Print email HTTP ${response.status}; reserved for safe retry`);
  const accepted = await response.json();
  if (!accepted.id) throw new Error('Printer response missing receipt ID; check provider before retry');
  // Preserve acceptance even when database acknowledgement fails.
  const receipt = {...claim,provider_id:accepted.id,submitted_at:new Date().toISOString()};
  save(receipt);
  await db(`SELECT public.submit_market_print_dispatch(${quote(lane)},${quote(manifest.batch_id)},${quote(hash)},${quote(accepted.id)}) AS receipt`);
  console.log(`${label} print batch submitted to ${printer}; receipt ${accepted.id}`);
  return receipt;
}
module.exports = { dispatch };
if (require.main === module) dispatch(process.argv[2],process.argv[3]).catch(error => { console.error(error.message);process.exitCode=1; });
