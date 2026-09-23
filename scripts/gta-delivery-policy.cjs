const GTA_RECIPIENT = 'business@starmovers.ca';
const isGtaRegion = region => ['toronto', 'gta'].includes(String(region || '').toLowerCase());
function assertGtaRecipient(region, to) {
  if (!isGtaRegion(region)) return;
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length || recipients.some(email => String(email).trim().toLowerCase() !== GTA_RECIPIENT)) {
    throw new Error('GTA delivery is restricted to business@starmovers.ca; print-shop delivery is disabled');
  }
}
module.exports = { GTA_RECIPIENT, isGtaRegion, assertGtaRecipient };
