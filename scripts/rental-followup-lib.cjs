const { mailingKey } = require('./rental-outreach-lib.cjs');
const DAY=86400000;
function followups(events, history, now = new Date()) {
  const result=[];
  for(const event of events.filter(e=>e.event_type==='leased_or_withdrawn')) {
    const row=event.record||event;
    const prior=history.find(h=>h.mailing_key===mailingKey(row)||(h.recipient?.source===event.source&&h.recipient?.source_listing_id===event.source_listing_id));
    if(!prior) continue;
    const date=prior.mailed_at||prior.created_at;
    if(event.observed_at && Date.parse(event.observed_at)<Date.parse(date)) continue;
    const gap=Math.floor((+now-Date.parse(date))/DAY);
    if(!Number.isFinite(gap)||gap<21) continue;
    const anchors=[];
    for(let month=0;month<3;month++) for(const day of [1,15]) {
      const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+month,day));
      if(+d>=+now+7*DAY) anchors.push(d);
    }
    const anchor=anchors.sort((a,b)=>a-b)[0];
    result.push({source:event.source,source_listing_id:event.source_listing_id,address:prior.recipient?.addressstreet||row.street_address,city:row.city,
      previous_batch_id:prior.batch_id,previous_date:date,date_basis:prior.mailed_at?'confirmed mailing':'generated batch — mailing unconfirmed',gap_days:gap,
      priority:gap>=28?'preferred gap reached':'minimum gap reached',
      planning_move_date:anchor.toISOString().slice(0,10),arrival_window_start:new Date(+anchor-14*DAY).toISOString().slice(0,10),arrival_window_end:new Date(+anchor-7*DAY).toISOString().slice(0,10),
      timing_basis:'Unverified 1st/15th planning assumption; actual move date takes priority',
      action:'Review first-mailing confirmation, current outgoing occupancy and move date before any second postcard',postcard_eligible:false});
  }
  return result.sort((a,b)=>b.gap_days-a.gap_days);
}
module.exports={followups};
