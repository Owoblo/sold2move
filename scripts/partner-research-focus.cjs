const {matchContact,phoneKey}=require('./partner-identity.cjs');
function researchFocus(representatives,contacts){
 if(!representatives.length)return [{kind:'identify_representatives',reason:'No source-backed person captured for this property'}];
 return representatives.flatMap(rep=>{
  const match=matchContact(rep,contacts);
  const direct=phoneKey(rep.phone)||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rep.email||'');
  const sourceReview=rep.provenance==='web_research_review';
  if(direct&&match.status!=='ambiguous'&&!sourceReview)return [];
  return [{kind:'verify_professional_contact',name:rep.name,brokerage:rep.brokerage||null,role:rep.role||'unknown',source_url:rep.source_url||null,known_phone:rep.phone||null,known_email:rep.email||null,
   reason:match.status==='ambiguous'?match.reason:sourceReview?'Research evidence requires review':'Missing direct business phone/email',
   instructions:'Find a public professional direct phone or published email explicitly attributed to this person. Shared brokerage/team numbers and inferred email patterns do not resolve identity.'}];
 });
}
module.exports={researchFocus};
