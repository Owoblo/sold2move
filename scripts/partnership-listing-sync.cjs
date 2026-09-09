#!/usr/bin/env node
// Independent internal sync: never sends messages or schedules outreach.
const fs = require('node:fs');
const path = require('node:path');
const { serviceClient, propertyKey, digest, clean } = require('./pipeline-review-lib.cjs');
const phoneKey = value => { const d = String(value || '').replace(/\D/g,''); return d.length === 11 && d[0] === '1' ? d.slice(1) : d.length === 10 ? d : ''; };
const nameKey = value => clean(String(value || '').replace(/\b(realtor|salesperson|sales person|broker of record|broker)\b/gi,''));
function representatives(row) {
  let reps = row.listing_representatives || [];
  if (typeof reps === 'string') { try { reps = JSON.parse(reps); } catch { reps = []; } }
  if (!Array.isArray(reps)) reps = [];
  if (row.agent_name) reps = [...reps,{ name: row.agent_name, phone: row.agent_phone, brokerage: row.brokerage_name, role: 'listing_representative' }];
  return [...new Map(reps.filter(r => r && r.name).map(r => [nameKey(r.name), {
    ...r, role: r.role || 'unknown', source_url: r.source_url || row.source_url || row.detailurl || null,
    provenance: r.provenance || 'listing_source',
  }])).values()];
}
function matchContact(rep, contacts) {
  const name = nameKey(rep.name), p = phoneKey(rep.phone), email = String(rep.email || '').trim().toLowerCase();
  const exact = contacts.filter(c => nameKey(c.name) === name && (
    (p && phoneKey(c.phone) === p) || (email && String(c.email || '').toLowerCase() === email) ||
    (rep.brokerage && clean(c.company) === clean(rep.brokerage))));
  if (exact.length === 1) return { contact: exact[0], status: 'matched' };
  if (exact.length > 1 || contacts.some(c => nameKey(c.name) === name)) return { contact: null, status: 'ambiguous' };
  return { contact: null, status: 'new' };
}
async function allRows(db, table, select) {
  const rows=[];
  for(let from=0;;from+=1000) {
    const {data,error}=await db.from(table).select(select).order('id').range(from,from+999);
    if(error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data); if(data.length<1000) return rows;
  }
}
async function sync(payload, {db=serviceClient(), contacts=null}={}) {
  if(!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for partnership sync');
  contacts = contacts || await allRows(db,'market_contacts','id,name,company,email,phone,city,do_not_contact,sequence_paused,last_touch_at,listing_discovery_key');
  const totals={ properties:payload.listings.length,connections:0,new_contacts:0,ambiguous:0,missing_representatives:0 };
  for(const row of payload.listings) {
    const key=propertyKey(row), reps=representatives(row), address=row.addressstreet||row.street_address||row.canonical_address||row.address||row.address_key;
    if(!address) continue;
    // Every property enters the separate research queue, including partially attributed ones.
    const queued=await db.from('partner_listing_research').upsert({property_key:key,listing:{...row,_lane:payload.lane,_region:payload.region,_run_id:payload.run_id,_observed_at:payload.observed_at,_batch_id:payload.postcard_batch_id}}, {onConflict:'property_key',ignoreDuplicates:true});
    if(queued.error) throw new Error(queued.error.message);
    if(!reps.length) totals.missing_representatives++;
    for(const rep of reps) {
      const repKey=digest([nameKey(rep.name),clean(rep.brokerage)||clean(row.city||row.addresscity)]);
      let {contact,status}=matchContact(rep,contacts);
      // Source-backed discoveries become paused CRM records. Research-only identities stay in review.
      if(status==='new' && rep.source_url && rep.provenance!=='web_research_review') {
        const candidate={ name:rep.name,company:rep.brokerage||'',title:rep.role,email:rep.email||null,phone:rep.phone||null,
          city:row.city||row.addresscity||null,industry:'Real Estate',stage:'target',
          source_csv:'postcard_listing_discovery',listing_discovery_key:repKey,
          sequence_paused:true,sequence_paused_reason:'Listing discovery — manual outreach only',
          tags:['listing-discovery',payload.lane],notes:`Listing source: ${rep.source_url}. No outreach sent by discovery.` };
        const created=await db.from('market_contacts').insert(candidate).select('id,name,company,email,phone,city,last_touch_at').single();
        if(created.error) {
          if(created.error.code!=='23505') throw new Error(created.error.message);
          const existing=await db.from('market_contacts').select('id,name,company,email,phone,city,last_touch_at').eq('listing_discovery_key',repKey).single();
          if(existing.error) throw new Error(existing.error.message); contact=existing.data;
        } else {contact=created.data;totals.new_contacts++;}
        contacts.push(contact);status='discovered';
      }
      if(status==='ambiguous') totals.ambiguous++;
      const record={activity_key:digest([key,payload.lane,repKey]),property_key:key,
        listing_id:String(row.zpid||row.source_listing_id||row.id||''),lane:payload.lane,
        region:row.region||payload.region,city:row.city||row.addresscity||null,address,
        listing_status:row.status||row.transaction_type||'available',
        status_evidence:payload.lane==='residential' && ['sold','sold_archived'].includes(row.status)?'inferred_first_disappearance':'source_reported',
        representative_key:repKey,representative:rep,contact_id:contact?.id||null,
        match_status:status,source_url:rep.source_url,observed_at:payload.observed_at,run_id:payload.run_id,
        postcard_batch_id:payload.postcard_batch_id||null,postcard_status:payload.postcard_batch_id?'selected':null};
      const existing=await db.from('partner_listing_activity').select('observed_at,contact_id,match_status,representative').eq('activity_key',record.activity_key).maybeSingle();
      if(existing.error) throw new Error(existing.error.message);
      if(existing.data?.observed_at > record.observed_at) continue;
      if(existing.data?.contact_id && !record.contact_id) record.contact_id=existing.data.contact_id;
      if(existing.data?.match_status === 'reviewed') { record.contact_id=existing.data.contact_id; record.match_status='reviewed'; }
      if(existing.data?.representative?.provenance !== 'web_research_review' && existing.data?.representative && rep.provenance === 'web_research_review') record.representative=existing.data.representative;
      const result=await db.from('partner_listing_activity').upsert(record);
      if(result.error) throw new Error(result.error.message);totals.connections++;
    }
  }
  return totals;
}
if(require.main===module) {
  const input=path.resolve(process.argv[2]);
  sync(JSON.parse(fs.readFileSync(input,'utf8'))).then(t=>{fs.writeFileSync(path.join(path.dirname(input),'partnership-sync-summary.json'),JSON.stringify(t,null,2));console.log(t);}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={representatives,matchContact,nameKey,phoneKey,sync};
