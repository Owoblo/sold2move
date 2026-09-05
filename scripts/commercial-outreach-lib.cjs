const crypto=require('crypto');
const {addressKey}=require('./rental-market-lib.cjs');
const VERSION='commercial-outgoing-v3';
const key=r=>`${r.source}|${r.source_listing_id}`;
const fingerprint=r=>crypto.createHash('sha256').update(JSON.stringify([r.description||'',r.photo_urls||[],r.unit_label||'',r.transaction_type,r.listing_scope])).digest('hex');
const detailFingerprint=r=>crypto.createHash('sha256').update(JSON.stringify([r.title,r.unit_label,r.photo_urls,r.photo_changed_at,r.transaction_type])).digest('hex');
function candidate(r){return r.acquisition_fresh===true&&r.transaction_type==='lease'&&!['land','vacant-land','agriculture','multifamily','multi-family'].includes(r.asset_type)&&r.listing_scope!=='business_sale';}
function evaluate(r,event,history=[],initial=false){
 const reasons=[];const specific=r.listing_scope==='unit'||r.listing_scope==='whole_building';
 if(!candidate(r))reasons.push('Fresh commercial lease listing required');
 if(!specific)reasons.push('One specific unit or exclusive whole premises required');
 if(r.classification_method!==VERSION||r.classification_stale||r.current_business_occupancy!=='occupied'||!(Number(r.classification_confidence)>=0.85))reasons.push('Strong current-business occupancy evidence required');
 if(r.advertised_unit_visible!==true&&r.explicit_current_occupant!==true)reasons.push('Evidence must identify the advertised premises');
 if(r.transition_direction!=='move_out_likely'||!(Number(r.transition_confidence)>=0.8))reasons.push('Evidence of the outgoing business transition required');
 if(!initial&&!['just_listed','relisted'].includes(event))reasons.push('Not newly listed or relisted');
 if(!/^\d+[A-Z]?\s/i.test(r.street_address||'')||!r.city||r.province!=='ON'||!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\s?\d[ABCEGHJ-NPRSTVWXYZ]\d$/i.test(r.postal_code||''))reasons.push('Complete Ontario mailing address required');
 const age=Date.now()-Date.parse(r.observed_at);if(!Number.isFinite(age)||age<0||age>8*86400000)reasons.push('Current acquisition required');
 const mailing_key=[addressKey(r.street_address),String(r.unit_label||'').toUpperCase(),r.city?.toUpperCase(),r.province].join('|');
 if(history.some(h=>h.mailing_key===mailing_key||(h.recipient?.source===r.source&&h.recipient?.source_listing_id===r.source_listing_id)))reasons.push('Business premises already in a commercial batch');
 return {...r,event_type:event,mailing_key,mailing_street:r.unit_label?`${r.street_address} Unit ${r.unit_label}`:r.street_address,postcard_eligible:!reasons.length,hold_reasons:reasons};
}
module.exports={VERSION,key,fingerprint,detailFingerprint,candidate,evaluate};
