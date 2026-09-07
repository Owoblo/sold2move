const fs = require('fs');
const path = require('path');
const { buildMarketWorkbook } = require('./market-xlsx-report.cjs');
const labels = { windsor: 'Windsor', chatham: 'Chatham', sarnia: 'Sarnia', london: 'London', woodstock: 'Woodstock', wkg: 'Kitchener / Waterloo / Cambridge / Guelph' };
const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table = (rows) => `<table style="border-collapse:collapse;width:100%;margin-bottom:20px">${rows.map((r,i)=>`<tr style="background:${i%2?'#fff':'#f5f5f5'}">${r.map(c=>`<td style="padding:8px;border:1px solid #ddd">${escape(c)}</td>`).join('')}</tr>`).join('')}</table>`;
async function buildCommercialReport(runDir) {
  const read = n => JSON.parse(fs.readFileSync(path.join(runDir,n)));
  const records=read('source-records.json'), summary=read('summary.json'), lifecycle=read('lifecycle-summary.json');
  const ai=read('ai-classification-summary.json'), queue=read('commercial-review-queue.json');
  const folder=fs.readFileSync(path.join(runDir,'current-postcard-output.txt'),'utf8').trim();
  if (!['postcards','postcards-supplement'].includes(folder)) throw new Error('Invalid commercial output folder');
  const manifest=read(`${folder}/commercial-batch.json`), recipients=manifest.recipients;
  const pending=Object.values(ai.regions).reduce((n,r)=>n+r.pending,0);
  const failures=(summary.realtor_runs||[]).filter(r=>r.status!=='ok').length;
  const reasons={};queue.filter(r=>!r.postcard_eligible).forEach(r=>r.hold_reasons.forEach(reason=>reasons[reason]=(reasons[reason]||0)+1));
  const date=new Date().toISOString().slice(0,10);
  const html=`<div style="font-family:Arial,sans-serif;max-width:650px;color:#1a1a1a"><h2>Commercial Postcard Pipeline — ${date}</h2>
  <p>${recipients.length} postcards generated for owner review. The target is the current outgoing business at the advertised premises. Physical mailing has not been confirmed.</p>
  <h3>Pipeline Summary</h3>${table([['Source lease listings',records.length],['Candidates checked',ai.target_count-pending],['Pending checks',pending],['Failed REALTOR searches',failures],['Postcards attached',recipients.length]])}
  <h3>By Region</h3>${table([['Region','Listings','Pending','Postcards'],...Object.entries(labels).map(([k,label])=>[label,records.filter(r=>r.acquisition_scope===k).length,ai.regions[k]?.pending||0,recipients.filter(r=>r.region===k).length])])}
  <h3>Held for Review</h3>${table(Object.entries(reasons))}<p>A listing can have more than one hold reason. Pending checks remain open; they have not been rejected.</p>
  <h3>Disappearance Tracking</h3><p>${(lifecycle.events||[]).filter(e=>/leased_or_withdrawn|sold_or_withdrawn/.test(e.event_type)).length} listings reached the disappearance threshold. Removal does not confirm a business move and does not automatically generate a second postcard.</p>
  <p>The workbook and review CSV include inventory, evidence, unit addresses and search coverage. A regional search is not proof that every community was individually checked. Vacant space, investment sales with tenants staying, and ambiguous multi-unit addresses are held.</p>
  <p>Regional artwork uses Saturn Star Movers branding. Print at actual size (100%). Saved artwork can be reprinted without scraping or AI. A separate report gives the actual Apify dollar breakdown; OpenAI, printing and postage are separate.</p></div>`;
  const dir=path.join(runDir,folder), attachments=[];
  if(recipients.length) for(const n of fs.readdirSync(dir).filter(n=>/\.(pdf|csv)$/.test(n))) attachments.push({filename:n,content:fs.readFileSync(path.join(dir,n)).toString('base64')});
  attachments.push({filename:'commercial-review-queue.csv',content:fs.readFileSync(path.join(runDir,'commercial-review-queue.csv')).toString('base64')});
  const reviewed=new Map(queue.map(r=>[`${r.source}|${r.source_listing_id}`,r]));
  const workbookRows=records.map(r=>{const q=reviewed.get(`${r.source}|${r.source_listing_id}`);return {...r,current_occupant_name:r.current_business_name||r.current_occupant_name,direct_relocation_candidate:q?.postcard_eligible===true,outreach_status:q?.postcard_eligible?'eligible_for_human_review':'market_intelligence_only',relocation_reasons:q?.hold_reasons||[]};});
  const workbook=await buildMarketWorkbook('commercial',workbookRows,lifecycle.events||[],summary.cities||[]);
  attachments.push({filename:`commercial-full-market-report-${date}.xlsx`,content:workbook.toString('base64')});
  return {from:process.env.MARKET_EMAIL_FROM||'Saturn Star Services <postcards@sold2move.com>',to:[process.env.MARKET_REPORT_EMAIL||'business@starmovers.ca'],reply_to:'business@starmovers.ca',subject:`Commercial ${pending?'Screening Update':'Postcard Review'} — ${date} (${recipients.length} postcards)`,html,attachments};
}
async function main(){const runDir=process.argv[2],body=await buildCommercialReport(runDir);fs.writeFileSync(path.join(runDir,'commercial-report.html'),body.html);if(process.argv.includes('--preview'))return;const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(`Commercial report email HTTP ${response.status}`);console.log('Commercial owner report delivered',await response.json());}
module.exports={buildCommercialReport};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
