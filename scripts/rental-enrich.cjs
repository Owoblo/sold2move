const fs = require('fs');
const path = require('path');
const { fetchDetailsViaApify } = require('./postcard-step2-photos.cjs');
const { startTracking } = require('./postcard-cost-report.cjs');
async function enrich(runDir, fetchDetails = fetchDetailsViaApify) {
  const file = path.join(runDir, 'normalized-source-records.json');
  const { resolveRentalAddress } = require('./rental-address.cjs');
  const rows = JSON.parse(fs.readFileSync(file)).map(resolveRentalAddress);
  const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json')));
  const { detailTargets, reusableForObservation } = require('./rental-screening-lib.cjs');
  const candidates = detailTargets(rows, lifecycle.events).filter(r => r.source === 'zillow' && !r.details_fetched_at && !(r.details_status === 'not_found' && Date.parse(r.details_attempted_at) >= Date.parse(r.observed_at)) && !reusableForObservation(r, r));
  let enriched = 0;
  for (const region of [...new Set(candidates.map(r => r.acquisition_scope))]) {
    startTracking(`rental-${region}`, `rental-${path.basename(runDir)}-details-${region}`);
    const regional = candidates.filter(r => r.acquisition_scope === region);
    for (let i = 0; i < regional.length; i += 100) {
      const chunk = regional.slice(i, i + 100);
      try {
        const results = await fetchDetails(chunk.map(r => ({ zpid: r.source_listing_id, addressstreet: r.mailing_street,
          city: r.city, addressstate: r.province, addresszipcode: r.postal_code, detailUrl: r.source_url })), process.env.APIFY_TOKEN);
        for (const row of chunk) {
          const detail = results.get(row.source_listing_id);
          row.details_attempted_at = new Date().toISOString();
          row.details_status = detail ? 'fetched' : 'not_found';
          if (!detail) continue;
          row.description = detail.description || row.description;
          if (detail.photos?.length) row.photo_urls = detail.photos;
          if (detail.address?.unit_label && !row.unit_label) row.unit_label = detail.address.unit_label;
          if (detail.address?.single_home) row.single_home = true;
          Object.assign(row, resolveRentalAddress(row));
          row.details_fetched_at = new Date().toISOString();
          enriched++;
        }
      } catch { console.warn(`Rental detail chunk failed for ${region}; remaining evidence stays available for review.`); }
    }
  }
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(runDir, 'rental-detail-summary.json'), JSON.stringify({ candidates: candidates.length, enriched }, null, 2));
}
if (require.main === module) enrich(process.argv[2]).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { enrich };
