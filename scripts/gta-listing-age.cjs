function listingAge(item) {
  for(const value of [item.daysOnZillow,item.timeOnZillow]) {
    if(value!==null&&value!==undefined&&value!==''&&typeof value!=='boolean'&&Number.isFinite(Number(value))&&Number(value)>=0) return {days:Number(value),source:'numeric_days_on_zillow'};
  }
  if(!['timeOnInfo','daysOnZillow'].includes(item.cardHighlight))return {days:null,source:null};
  const label=String(item.marketingTagline||'').trim();
  const match=label.match(/^(\d+)\s+(minute|hour|day)s?\s+(?:ago|on Zillow)$/i);
  if(!match)return {days:null,source:null};
  return {days:Number(match[1])*({minute:1/1440,hour:1/24,day:1}[match[2].toLowerCase()]),source:'listing_age_badge',label};
}
module.exports={listingAge};
