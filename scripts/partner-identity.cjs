const clean=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const nameKey=v=>clean(String(v||'').replace(/\b(realtor|salesperson|sales person|broker of record|broker)\b/gi,''));
const phoneKey=v=>{const d=String(v||'').replace(/\D/g,'');return d.length===11&&d[0]==='1'?d.slice(1):d.length===10?d:''};
const emailKey=v=>String(v||'').trim().toLowerCase();
const indexes=new WeakMap();
function indexContacts(contacts){
 let index=indexes.get(contacts);if(!index||index.count>contacts.length){index={count:0,name:new Map(),phone:new Map(),email:new Map()};indexes.set(contacts,index)}
 for(;index.count<contacts.length;index.count++){const c=contacts[index.count];for(const [kind,key] of [['name',nameKey(c.name)],['phone',phoneKey(c.phone)],['email',emailKey(c.email)]]){if(!key)continue;const list=index[kind].get(key)||[];list.push(c);index[kind].set(key,list)}}return index;
}
function matchContact(rep,contacts){
 const index=indexContacts(contacts);
 const name=nameKey(rep.name),phone=phoneKey(rep.phone),email=emailKey(rep.email);
 if(!name)return {contact:null,status:'ambiguous',reason:'missing_person_name'};
 const byPhone=phone?(index.phone.get(phone)||[]):[];
 const byEmail=email?(index.email.get(email)||[]):[];
 const strong=[...new Map([...byPhone,...byEmail].map(c=>[c.id,c])).values()];
 if(strong.length===1&&nameKey(strong[0].name)===name)return {contact:strong[0],status:'matched',reason:'name_and_unique_direct_identifier'};
 if(strong.length)return {contact:null,status:'ambiguous',reason:'shared_or_conflicting_identifier'};
 const names=(index.name.get(name)||[]);
 if(names.length)return {contact:null,status:'ambiguous',reason:'name_or_brokerage_requires_review'};
 return {contact:null,status:'new',reason:'no_existing_identity'};
}
module.exports={matchContact,nameKey,phoneKey};
