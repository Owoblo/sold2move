const fs = require('fs');
const path = require('path');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
function restore(source = 'rental-resume-source', root = path.join(__dirname, '..')) {
  const files = walk(source);
  const pointers = files.filter(file => path.basename(file) === 'latest-run.txt' && path.basename(path.dirname(file)) === '.pipeline-rentals');
  if (pointers.length !== 1) throw new Error(`Expected one saved rental snapshot, found ${pointers.length}`);
  const runId = fs.readFileSync(pointers[0], 'utf8').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error('Invalid saved rental run ID');
  const pipeline = path.dirname(pointers[0]);
  for (const name of ['summary.json', 'normalized-source-records.json', 'canonical-properties.json']) {
    if (!fs.existsSync(path.join(pipeline, runId, name))) throw new Error(`Saved scrape missing ${name}`);
  }
  fs.cpSync(pipeline, path.join(root, 'scripts/.pipeline-rentals'), { recursive: true });
  const costs = path.join(root, 'reports/apify-costs');
  fs.mkdirSync(costs, { recursive: true });
  for (const file of files.filter(f => f.endsWith('.jsonl') && path.basename(path.dirname(f)) === 'apify-costs')) fs.copyFileSync(file, path.join(costs, path.basename(file)));
  console.log(`Restored rental acquisition ${runId}; inventory scrape will be skipped.`);
}
if (require.main === module) restore();
module.exports = { restore };
