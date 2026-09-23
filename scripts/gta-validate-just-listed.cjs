#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const Papa=require('papaparse');const OpenAI=require('openai');const {PDFDocument}=require('pdf-lib');
const {serviceClient,filterPrintClaims,onePiecePerProperty}=require('./pipeline-review-lib.cjs');
const {readMailHistory}=require('./gta-validate-candidates.cjs');
const {normalizeAddressKey,applyOutputFilters,generatePDF}=require('./postcard-step5-output.cjs');
const {verifyLocalAddress}=require('./postcard-step4-geocode.cjs');
const {classifyProperty,getClassificationPhotoUrls}=require('./postcard-step3-furniture.cjs');
const out=path.join(__dirname,'..','reports','gta-just-listed-validation');
const save=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2));
async function main(){
 fs.mkdirSync(out,{recursive:true});const encoded=Array.from({length:6},(_,i)=>process.env[`GTA_JUST_LISTED_${i+1}`]||'').join('');
 const rows=JSON.parse(zlib.gunzipSync(Buffer.from(encoded,'base64')));const db=serviceClient();if(!db)throw Error('Service credentials required');
 const history=await readMailHistory(db),rejected=[],ready=[];const historyKeys=new Set(history.filter(h=>h.just_listed_postcard_sent_at||h.sold_postcard_sent_at||Number(h.postcard_send_count)>=2).map(normalizeAddressKey));const historyIds=new Set(history.filter(h=>h.just_listed_postcard_sent_at||h.sold_postcard_sent_at||Number(h.postcard_send_count)>=2).map(h=>String(h.zpid)));
 const snapshotResult=await db.storage.from('gta-inventory').download('latest.json');if(snapshotResult.error)throw snapshotResult.error;const snapshot=JSON.parse(await snapshotResult.data.text());if(Date.now()-Date.parse(snapshot.collected_at)>48*3600000)throw Error('Inventory older than 48 hours');const active=new Set(snapshot.inventory.filter(r=>r.last_seen_at===snapshot.collected_at).map(r=>String(r.zpid)));
 for(const r of rows){
  const held=reason=>rejected.push({zpid:r.zpid,reason});
  if(!active.has(String(r.zpid))){held('not_in_current_inventory');continue;}
  if(historyIds.has(String(r.zpid))||historyKeys.has(normalizeAddressKey(r))){held('prior_mail_event_at_property');continue;}
  const elapsed=(Date.now()-Date.parse(r.scraped_at))/86400000;const days=r.search_days_on_zillow+elapsed;
  if(!Number.isFinite(days)||days<0||days>30){held('stale_or_unknown_listing_age');continue;}
  r.current_age_days=days;
  if(r.unformattedprice<300000||r.addressstate!=='ON'||['LOT','LAND'].includes(String(r.contenttype).toUpperCase())){held('price_province_or_land');continue;}
  const geo=verifyLocalAddress(r);r._geocode_verified=geo.verified;r._geocode_reason=geo.reason;
  if(geo.verified!==true){held('address_format_hold');continue;}
  if(getClassificationPhotoUrls(r).length<2){held('insufficient_photos');continue;}
  ready.push(r);
 }
 const claims=await filterPrintClaims(ready);rejected.push(...claims.rejected);const unique=onePiecePerProperty(claims.kept);rejected.push(...unique.rejected);
 save('preflight.json',{input:rows.length,ready_for_vision:unique.kept.length,rejected});console.log(`Just-listed preflight: ${rows.length} candidates, ${unique.kept.length} ready for photo qualification`);
 const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});let cursor=0,completed=0;const classified=[];
 await Promise.all(Array.from({length:5},async()=>{while(cursor<unique.kept.length){const r=unique.kept[cursor++];try{
  const c=await classifyProperty(openai,r,getClassificationPhotoUrls(r));Object.assign(r,{market_segment:c.market_segment,listing_categories:c.listing_categories,occupancy_state:c.occupancy_state,outreach_target:c.outreach_target,property_signals:c.property_signals,classification_confidence:c.confidence,classification_reasons:c.reasons,property_classified_at:new Date().toISOString(),is_furnished:['furnished','partially_furnished'].includes(c.occupancy_state)});classified.push(r);
 }catch(e){rejected.push({zpid:r.zpid,reason:'classification_unavailable',error:e.message});}completed++;if(completed%25===0){save('classified.json',classified);save('rejected.json',rejected);console.log(`Photo qualification: ${completed}/${unique.kept.length}`);}}}));
 const output=applyOutputFilters(classified,{});rejected.push(...output.rejected);const selected=output.finalListings.sort((a,b)=>a.city.localeCompare(b.city)||a.addressstreet.localeCompare(b.addressstreet));save('classified.json',classified);save('qualified-just-listed.json',selected);save('rejected.json',rejected);
 fs.writeFileSync(path.join(out,'qualified-just-listed.csv'),Papa.unparse(selected.map(({carouselphotos,...r})=>r),{escapeFormulae:true}));
 let pages=0;if(selected.length){const file=path.join(out,'Toronto_GTA_Just_Listed_Front_Only.pdf');await generatePDF(selected,file,{region:'toronto'});pages=(await PDFDocument.load(fs.readFileSync(file))).getPageCount();if(pages!==selected.length)throw Error('PDF count mismatch');}
 const summary={checked_at:new Date().toISOString(),input_candidates:rows.length,photo_classified:classified.length,qualified_just_listed:selected.length,pdf_pages:pages,age_0_7:selected.filter(r=>r.current_age_days<=7).length,age_8_30:selected.filter(r=>r.current_age_days>7).length,rejected_by_reason:rejected.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{}),mail_sent:0,recipient:'business@starmovers.ca',quality_policy:'Existing homeowner/photo filters and local address-format validation',freshness_policy:'Current active inventory; <=30 days using numeric days-on-market or explicit listing-age badge; absent from August qualified IDs and addresses',historical_comparison_caveat:'August is a qualified subset, not a full inventory. Listing-age evidence is required.'};save('summary.json',summary);console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
