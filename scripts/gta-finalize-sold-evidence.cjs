#!/usr/bin/env node
// Reapply current status/date rules to preserved, mail-history-checked evidence.
// Does not rescrape, mutate send history, or send mail.
const fs=require('node:fs'),path=require('node:path'),Papa=require('papaparse');
const {PDFDocument}=require('pdf-lib');
const {statusDecision}=require('./gta-validate-candidates.cjs');
const {normalizeAddressKey,applyOutputFilters,generatePDF}=require('./postcard-step5-output.cjs');
async function main(){
 const [output,...sources]=process.argv.slice(2);if(!output||!sources.length)throw Error('Usage: node gta-finalize-sold-evidence.cjs OUTPUT EVIDENCE_DIR [EVIDENCE_DIR...]');
 fs.mkdirSync(output,{recursive:true});const details=new Map();let decisions,rejected,prior;
 for(const source of sources){for(const file of fs.readdirSync(source).filter(f=>/^details-.*\.json$/.test(f)))for(const r of JSON.parse(fs.readFileSync(path.join(source,file))))details.set(String(r.zpid||r.id),r);
  if(fs.existsSync(path.join(source,'decisions.json'))){decisions=JSON.parse(fs.readFileSync(path.join(source,'decisions.json')));rejected=JSON.parse(fs.readFileSync(path.join(source,'rejected.json')));prior=JSON.parse(fs.readFileSync(path.join(source,'summary.json')));}}
 if(!decisions||!prior||decisions.length+rejected.length!==prior.input_candidates)throw Error('Incomplete candidate accounting');
 if(Date.now()-Date.parse(prior.checked_at)>24*3600000)throw Error('Mail-history evidence older than 24 hours');
 const reviewed=decisions.map(r=>{const d=details.get(String(r.zpid));const result={...r,...statusDecision(d,r.observed_at)};if(result.decision==='verified_sold'){
  const a=d.listingAddress||d.address||{};const actual={addressstreet:a.street||a.streetAddress,addresszipcode:a.zipCode||a.zipcode};
  if(!actual.addressstreet||normalizeAddressKey(actual)!==normalizeAddressKey(r)){result.decision='held';result.reason='detail_address_mismatch_or_unavailable';}
 }return result;});
 const filtered=applyOutputFilters(reviewed.filter(r=>r.decision==='verified_sold'),{});if(filtered.rejected.length)throw Error('A verified sale failed final quality filters');const selected=filtered.finalListings;
 fs.writeFileSync(path.join(output,'sold-status-decisions.json'),JSON.stringify(reviewed,null,2));
 fs.writeFileSync(path.join(output,'sold-excluded-before-status.json'),JSON.stringify(rejected,null,2));
 fs.writeFileSync(path.join(output,'qualified-sold.json'),JSON.stringify(selected,null,2));
 for(const [name,rows]of [['qualified-sold',selected],['held-sold-candidates',reviewed.filter(r=>r.decision==='held')],['excluded-currently-listed',reviewed.filter(r=>r.decision==='excluded')]])fs.writeFileSync(path.join(output,name+'.csv'),Papa.unparse(rows,{escapeFormulae:true}));
 let pages=0;if(selected.length){const file=path.join(output,'Toronto_GTA_Verified_Sold_Front_Only.pdf');await generatePDF(selected,file,{region:'toronto'});pages=(await PDFDocument.load(fs.readFileSync(file))).getPageCount();if(pages!==selected.length)throw Error('Envelope page count mismatch');}
 const summary={checked_at:new Date().toISOString(),mail_history_checked_at:prior.checked_at,input_candidates:prior.input_candidates,excluded_before_status:rejected.length,verified_sold:selected.length,held:reviewed.filter(r=>r.decision==='held').length,excluded_currently_listed:reviewed.filter(r=>r.decision==='excluded').length,pdf_pages:pages,mail_sent:0,reasons:reviewed.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{}),return_address:['SSM | Saturn Star Movers','426-2285 The Collegeway','Mississauga, ON L5L 2M3'],delivery_recipient:'business@starmovers.ca'};
 fs.writeFileSync(path.join(output,'sold-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
