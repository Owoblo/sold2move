const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {dispatch}=require('./market-print-dispatch.cjs');
(async()=>{
 process.env.RESEND_API_KEY='test-only';
 for(const lane of ['rental','commercial']){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'market-print-test-'));
  try {
   const out=path.join(dir,'postcards');fs.mkdirSync(out);fs.writeFileSync(path.join(dir,'current-postcard-output.txt'),'postcards');
   const rows=[{region:'windsor',addressstreet:'1 Test St',city:'Windsor',addresszipcode:'N8X1A1',mailing_key:'test'}];
   const manifest={campaign:lane==='rental'?'rental-current-occupant-v1':'commercial-outgoing-business-v1',batch_id:`${lane}-test`,recipients:rows,recipient_sha256:require(`./${lane}-artwork.cjs`).digest(rows)};
   const manifestPath=path.join(out,`${lane}-batch.json`);fs.writeFileSync(manifestPath,JSON.stringify(manifest));
   const csvPath=path.join(out,`${lane}-recipients.csv`),csv=require('papaparse').unparse(rows);fs.writeFileSync(csvPath,csv);
   const pdf=await PDFDocument.create();pdf.addPage();fs.writeFileSync(path.join(out,`${lane==='rental'?'Rental':'Commercial'}_windsor_${manifest.batch_id}.pdf`),await pdf.save());
   fs.writeFileSync(path.join(out,'private-review.csv'),'secret');
   let submitted=false,failAck=true,calls=[];
   const db=async sql=>{
    if(sql.includes('claim_market'))return [{receipt:{recipient:'loonieprints@gmail.com',submitted_at:submitted?'2026-09-09T00:00:00Z':null,provider_id:submitted?'receipt-test':null}}];
    if(failAck){failAck=false;throw new Error('Database acknowledgement unavailable');}
    submitted=true;return [{receipt:{}}];
   };
   const fetchImpl=async(url,options)=>{calls.push(options);const body=JSON.parse(options.body);assert.deepEqual(body.to,['loonieprints@gmail.com']);assert.equal(body.attachments.length,2);assert(!options.body.includes('private-review'));return {ok:true,json:async()=>({id:'receipt-test'})};};
   await assert.rejects(dispatch(lane,dir,{db,fetchImpl}),/acknowledgement/);
   assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'market-print-receipt.json'))).provider_id,'receipt-test');
   await dispatch(lane,dir,{db,fetchImpl});
   assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);
   await dispatch(lane,dir,{db,fetchImpl});assert.equal(calls.length,2);
   fs.writeFileSync(csvPath,csv.replace('1 Test St','9 Wrong St'));
   await assert.rejects(dispatch(lane,dir,{db,fetchImpl}),/CSV differs/);assert.equal(calls.length,2);
   fs.writeFileSync(csvPath,csv);
   await assert.rejects(dispatch(lane,dir,{db:async()=>{throw new Error('Claim denied');},fetchImpl}),/Claim denied/);assert.equal(calls.length,2);
   manifest.recipients=[];manifest.recipient_sha256=require(`./${lane}-artwork.cjs`).digest([]);fs.writeFileSync(manifestPath,JSON.stringify(manifest));
   assert.deepEqual(await dispatch(lane,dir,{db:async()=>assert.fail('Empty batch accessed database'),fetchImpl}),{skipped:true});
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 }
 console.log('Market printer routing, attachment isolation, receipt recovery, stable retries, duplicate suppression and fail-closed checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
