const fs=require('fs'),path=require('path');
const {validateManifest,digest,renderRental}=require('./rental-artwork.cjs');
const {resolveRentalAddress}=require('./rental-address.cjs');
const {addressKey}=require('./rental-market-lib.cjs');
const {mailingKey}=require('./rental-outreach-lib.cjs');
const key=r=>`${r.source}|${r.source_listing_id}`;
function correct(manifests,records) {
 const indexed=new Map(records.map(r=>[key(r),r]));const recipients=[],changes=[],seen=new Set();
 for(const manifest of manifests) {
  validateManifest(manifest);
  for(const prior of manifest.recipients) {
   if(seen.has(key(prior))) throw new Error('Duplicate saved recipient across correction batches');
   seen.add(key(prior));
   const source=indexed.get(key(prior));if(!source) throw new Error('Saved source evidence missing for correction');
   const resolved=resolveRentalAddress(source);
   if(addressKey(resolved.street_address)!==addressKey(prior.addressstreet)||resolved.city.toUpperCase()!==prior.city.toUpperCase()||resolved.postal_code.replace(/\s/g,'').toUpperCase()!==prior.addresszipcode.replace(/\s/g,'').toUpperCase()) throw new Error('Correction would change property identity; review required');
   if(resolved.unit_address_unresolved) throw new Error(`Ambiguous unit needs review: ${prior.addressstreet}`);
   if(resolved.mailing_street.toUpperCase()!==prior.addressstreet.toUpperCase()) {
    changes.push({source:prior.source,source_listing_id:prior.source_listing_id,from:prior.addressstreet,to:resolved.mailing_street,evidence:resolved.address_evidence});
    recipients.push({...prior,addressstreet:resolved.mailing_street,mailing_key:mailingKey(resolved)});
   } else recipients.push(prior);
  }
 }
 const manifest={campaign:'rental-current-occupant-v1',batch_id:manifests[0].batch_id+'-address-correction-v1',created_at:new Date().toISOString(),
  recipients,recipient_sha256:digest(recipients),correction_of:manifests.map(m=>({batch_id:m.batch_id,recipient_sha256:m.recipient_sha256})),address_corrections:changes,
  delivery_status:'replacement_for_review',physical_mailing_confirmed:false};
 validateManifest(manifest);return manifest;
}
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function run(sourceDir,outputDir) {
 const files=walk(sourceDir);const records=files.filter(f=>path.basename(f)==='normalized-source-records.json');
 if(records.length!==1) throw new Error('Expected one saved inventory snapshot');
 const manifests=files.filter(f=>path.basename(f)==='rental-batch.json').map(f=>JSON.parse(fs.readFileSync(f))).filter(m=>m.recipients.length);
 if(!manifests.length) throw new Error('No saved recipient batches');
 const manifest=correct(manifests,JSON.parse(fs.readFileSync(records[0])));
 await renderRental(manifest,outputDir);
 console.log(`Replacement artwork: ${manifest.recipients.length} existing recipients; ${manifest.address_corrections.length} unit-address corrections.`);
 return manifest;
}
module.exports={correct,run};
if(require.main===module)run(process.argv[2],process.argv[3]).catch(e=>{console.error(e.message);process.exitCode=1});
