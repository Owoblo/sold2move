const fs = require('fs');
const path = require('path');
const { buildMarketWorkbook } = require('./market-xlsx-report.cjs');
const { targets } = require('./rental-screening-lib.cjs');
const { buildRentalQueue } = require('./rental-outreach-lib.cjs');
const labels = { windsor: 'Windsor', chatham: 'Chatham', sarnia: 'Sarnia', london: 'London', woodstock: 'Woodstock', wkg: 'Waterloo / Kitchener / Guelph' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cell = 'padding:8px;border:1px solid #ddd;';
function table(rows, headers = []) {
  return `<table style="border-collapse:collapse;width:100%;margin:0 0 20px">${headers.length ? `<tr style="background:#f5f5f5">${headers.map(h=>`<th style="${cell}text-align:left">${escape(h)}</th>`).join('')}</tr>` : ''}${rows.map((row,i)=>`<tr style="background:${i%2?'#fff':'#f5f5f5'}">${row.map((v,n)=>`<td style="${cell}${n?'text-align:center;':''}">${escape(v)}</td>`).join('')}</tr>`).join('')}</table>`;
}
async function buildRentalReport(runDir) {
  const read = file => JSON.parse(fs.readFileSync(path.join(runDir,file)));
  const inventory = read('normalized-source-records.json'), lifecycle = read('lifecycle-summary.json');
  const summary = read('summary.json'), ai = read('ai-classification-summary.json');
  const pointer = path.join(runDir,'current-postcard-output.txt');
  const folder = fs.existsSync(pointer) ? fs.readFileSync(pointer,'utf8').trim() : 'postcards';
  if (!['postcards','postcards-supplement'].includes(folder)) throw new Error('Invalid rental output pointer');
  const manifest = read(`${folder}/rental-batch.json`), recipients = manifest.recipients;
  const candidates = targets(inventory,lifecycle.events || []);
  const screened = candidates.filter(r=>!r.classification_stale);
  const counts = screened.reduce((a,r)=>(a[r.current_occupancy||'unknown']=(a[r.current_occupancy||'unknown']||0)+1,a),{});
  const qualified = buildRentalQueue(inventory,lifecycle.events || []).filter(r=>r.postcard_eligible).length;
  const pending = candidates.length-screened.length;
  const followupPath = path.join(runDir,'rental-followup-review.json');
  const followup = fs.existsSync(followupPath) ? JSON.parse(fs.readFileSync(followupPath)) : [];
  const disappearances = (lifecycle.events || []).filter(e=>e.event_type==='leased_or_withdrawn').length;
  const date = new Date().toISOString().slice(0,10);
  const section = title => `<h3 style="color:#333;margin-bottom:8px">${title}</h3>`;
  const rows = Object.entries(labels).map(([region,label])=>{
    const regional = candidates.filter(r=>r.acquisition_scope===region);
    return [label,inventory.filter(r=>r.acquisition_scope===region).length,regional.length,regional.filter(r=>!r.classification_stale).length,recipients.filter(r=>r.region===region).length];
  });
  const cityCounts = recipients.reduce((a,r)=>(a[r.city||'Unknown']=(a[r.city||'Unknown']||0)+1,a),{});
  const costPath = path.resolve(runDir,'../../../reports/apify-costs/cost-report.json');
  const cost = fs.existsSync(costPath) ? JSON.parse(fs.readFileSync(costPath)) : null;
  const intro = recipients.length ? (manifest.supplemental
    ? 'Your additional rental postcard batch is ready. These recipients exclude earlier batches; keep the previously delivered PDFs.'
    : 'Your rental postcard batch is ready. It targets current occupants of newly listed or relisted homes and units.')
    : 'No additional postcards were generated. Previously delivered batches remain unchanged.';
  const subject = `Rental ${recipients.length ? 'Postcards Ready' : pending ? 'Screening Update' : 'Pipeline Complete'} — ${date} (${recipients.length}${manifest.supplemental?' additional':''} postcards)`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#1a1a1a">
    <h2 style="color:#1a1a1a">Rental Postcard Pipeline — ${date}</h2><p>${intro}</p>
    ${section('Pipeline Summary')}${table([
      ['Total source listings found',inventory.length],
      ['New or relisted unit/home candidates',candidates.length],
      ['Candidates screened',screened.length],['Pending checks',pending],
      ['Current occupant detected',counts.occupied||0],['Vacant — held',counts.vacant||0],
      ['Staged — held',counts.staged||0],['Uncertain occupancy — held',counts.unknown||0],
      ['Qualified addresses in this snapshot',qualified],
    ])}
    <table style="border-collapse:collapse;width:100%;margin:0 0 20px"><tr style="background:#e0f2fe"><td style="${cell}font-weight:bold">${manifest.supplemental?'Additional postcards attached':'Final postcards attached'}</td><td style="${cell}font-weight:bold;font-size:18px;text-align:center">${recipients.length}</td></tr></table>
    <p style="color:${pending?'#b45309':'#166534'}">${pending?`${pending} checks remain pending; they have not been rejected.`:'Screening complete across all six regions.'}</p>
    ${section('By Region')}${table(rows,['Region','Listings','Candidates','Screened','Attached'])}
    ${recipients.length?section('Postcards by City')+table(Object.entries(cityCounts),['City','Postcards']):''}
    ${section('Rental Disappearance Tracking')}
    <p>${disappearances} listings were absent from two consecutive successful source scrapes. They may have been leased or withdrawn. This does not confirm a move. The full workbook includes their lifecycle records.</p>
    <p><b>First postcard:</b> at the first qualifying occupied listing. <b>Follow-up review:</b> ${followup.length} previously batched addresses have disappeared after at least 21 days (28 preferred). Confirm the first mailing and that the outgoing occupant is still there before a second postcard. Plan arrival 7–14 days before the expected move; the 1st/15th are planning assumptions unless a date is verified.</p>
    ${cost?section('Scrape Cost')+`<p>Apify actor usage for this saved scrape: <b>$${Number(cost.knownTotalUsd).toFixed(2)} USD</b>${cost.complete?'':' (partial; some costs pending)'}. This is cumulative across its acquisition and recovery steps. OpenAI, printing and postage are separate.</p>`:''}
    <p>${recipients.length?'The regional PDFs and recipient CSV are attached. Artwork is 7.25&quot; × 5.25&quot;; print at actual size (100%). ':''}The workbook contains the complete inventory, screening evidence and requested-city coverage. Generated artwork is not confirmation of physical mailing.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#888;font-size:12px">Automated by Sold2Move Postcard Pipeline — Rentals</p></div>`;
  const dir = path.join(runDir,folder);
  const attachments = recipients.length ? fs.readdirSync(dir).filter(n=>/\.(pdf|csv)$/.test(n)&&fs.statSync(path.join(dir,n)).size>0).map(n=>({filename:n,content:fs.readFileSync(path.join(dir,n)).toString('base64')})) : [];
  if (followup.length) attachments.push({filename:'rental-followup-review.csv',content:fs.readFileSync(path.join(runDir,'rental-followup-review.csv')).toString('base64')});
  const workbook = await buildMarketWorkbook('rental',inventory,lifecycle.events||[],summary.cities||[]);
  attachments.push({filename:`rental-full-market-report-${date}.xlsx`,content:workbook.toString('base64')});
  return {from:process.env.MARKET_EMAIL_FROM||'Saturn Star Services <postcards@sold2move.com>',to:[process.env.MARKET_REPORT_EMAIL||'business@starmovers.ca'],reply_to:'business@starmovers.ca',subject,html,text:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),attachments};
}
module.exports = { buildRentalReport };
