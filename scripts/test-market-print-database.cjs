// Transactional fixtures are rolled back; never sends emails or alters real batches.
const {query}=require('./market-db.cjs');
const {randomUUID}=require('node:crypto');
(async()=>{
 for(const lane of ['rental','commercial']){
  const id=`dispatch-test-${randomUUID()}`;
  await query(`BEGIN;
    INSERT INTO ${lane}_postcard_batches(batch_id,manifest) VALUES('${id}','{"recipients":[{"mailing_key":"${id}"}]}');
    INSERT INTO ${lane}_postcard_recipients(mailing_key,batch_id,recipient) VALUES('${id}','${id}','{}');
    DO $$ DECLARE r jsonb; BEGIN
      BEGIN
        PERFORM claim_market_print_dispatch('${lane}','${id}','loonieprints@gmail.com',repeat('a',64),'[]');
        RAISE EXCEPTION 'TEST FAILURE: mismatched recipients accepted';
      EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST FAILURE:%' THEN RAISE; END IF; END;
      r := claim_market_print_dispatch('${lane}','${id}','loonieprints@gmail.com',repeat('a',64),'[{"mailing_key":"${id}"}]');
      IF r->>'submitted_at' IS NOT NULL THEN RAISE EXCEPTION 'New claim marked submitted'; END IF;
      BEGIN
        PERFORM claim_market_print_dispatch('${lane}','${id}','loonieprints@gmail.com',repeat('b',64),'[{"mailing_key":"${id}"}]');
        RAISE EXCEPTION 'TEST FAILURE: changed payload accepted';
      EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST FAILURE:%' THEN RAISE; END IF; END;
      UPDATE market_print_dispatches SET started_at=now()-interval '24 hours' WHERE batch_id='${id}';
      BEGIN
        PERFORM claim_market_print_dispatch('${lane}','${id}','loonieprints@gmail.com',repeat('a',64),'[{"mailing_key":"${id}"}]');
        RAISE EXCEPTION 'TEST FAILURE: expired unresolved attempt accepted';
      EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST FAILURE:%' THEN RAISE; END IF; END;
      PERFORM submit_market_print_dispatch('${lane}','${id}',repeat('a',64),'test-receipt');
      r := claim_market_print_dispatch('${lane}','${id}','loonieprints@gmail.com',repeat('a',64),'[{"mailing_key":"${id}"}]');
      IF r->>'provider_id' <> 'test-receipt' OR r->>'submitted_at' IS NULL THEN RAISE EXCEPTION 'Submitted replay lost receipt'; END IF;
    END $$;
    ROLLBACK;`);
 }
 console.log('Live database print claims, payload locks, expiry holds and submitted replay passed; fixtures rolled back.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
