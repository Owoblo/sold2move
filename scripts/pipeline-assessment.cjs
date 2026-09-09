const fs = require('node:fs');
const path = require('node:path');
const { writeAssessment } = require('./pipeline-review-lib.cjs');
const read = (dir, name, fallback) => fs.existsSync(path.join(dir,name)) ? JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')) : fallback;
async function run(lane, dir, options = {}) {
  const residential = lane === 'residential';
  const manifest = read(dir,'batch-manifest.json',{}), summary = read(dir,'summary.json',{});
  const candidates = read(dir, residential ? 'step1-filtered.json' : lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json', []);
  const selected = read(dir,residential ? 'step5-final.json' : lane === 'rental' ? 'canonical-properties.json' : 'relocation-candidates.json', []);
  const input = {
    runId: manifest.batch_id || summary.run_id || path.basename(dir), lane,
    region: manifest.region || options.region || 'all',
    observedAt: manifest.generated_at || options.observedAt || new Date().toISOString(),
    scope: residential ? { cities: [...(options.cities || [])].sort(), minPrice: options.minPrice ?? 300000,
      windowDays: options.from && options.to ? Math.round((Date.parse(options.to)-Date.parse(options.from))/86400000) : 7, policy: 'first-disappearance-v1', includeUnscanned: !!options.includeUnscanned,
      skipFurniture: !!options.skipFurniture, skipGeocode: !!options.skipGeocode } : { lane, policy: 'existing-market-filters-v1', sources: summary.sources || (summary.source_families || []).map(s => s.source_family || s.sourceFamily) },
    candidates, selected, rejected: lane === 'commercial'
      ? candidates.filter(r => !r.direct_relocation_candidate).map(r => ({ id: r.source_listing_id, reason: r.listing_scope !== 'unit' ? 'no_specific_unit' : !r.current_occupant_name ? 'no_identified_current_occupant' : 'insufficient_transition_evidence_or_score' }))
      : read(dir,residential ? 'step5-rejected.json' : 'rejected-records.json',[]),
    health: residential ? read(dir,'step5-health-summary.json',{}) : summary,
    sourceCount: summary.totals?.raw_records ?? summary.totals?.source_records ?? null,
  };
  fs.writeFileSync(path.join(dir,'partnership-input.json'), JSON.stringify({run_id:input.runId,lane,region:input.region,
    observed_at:input.observedAt,postcard_batch_id:residential ? input.runId : null,
    listings: residential ? selected : candidates}, null, 2));
  const assessment = await writeAssessment(input, dir, { persist: !options.dryRun });
  console.log(`Assessment: ${selected.length} selected; ${assessment.report.comparable_history_count}/2 comparable prior runs`);
  return assessment;
}
if (require.main === module) run(process.argv[2],path.resolve(process.argv[3])).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports = { run };
