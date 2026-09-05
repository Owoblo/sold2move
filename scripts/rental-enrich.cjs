const fs = require('fs');
const path = require('path');
const { fetchDetailsViaApify } = require('./postcard-step2-photos.cjs');
const { startTracking } = require('./postcard-cost-report.cjs');
async function enrich(runDir, fetchDetails = fetchDetailsViaApify) {
  const file = path.join(runDir, 'normalized-source-records.json');
  const rows = JSON.parse(fs.readFileSync(file));
  const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json')));
  const fresh = new Set(lifecycle.events.filter(e => ['just_listed', 'relisted'].includes(e.event_type)).map(e => `${e.source}|${e.source_listing_id}`));
  const candidates = rows.filter(r => r.source === 'zillow' && r.acquisition_fresh && fresh.has(`${r.source}|${r.source_listing_id}`)
    && (r.unit_label || r.single_home)).slice(0, 150);
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
          if (!detail) continue;
          row.description = detail.description || row.description;
          if (detail.photos?.length) row.photo_urls = detail.photos;
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
