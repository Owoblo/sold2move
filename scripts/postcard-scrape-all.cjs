const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
const lib = require(path.join(root, 'scripts/postcard-lib.cjs'));
const { REGION_CONFIG } = require(path.join(root, 'scripts/postcard-region-config.cjs'));
const { run } = require(path.join(root, 'scripts/postcard-step0-scrape.cjs'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(root, 'reports', 'local-scrape-' + stamp);
fs.mkdirSync(output, { recursive: true });
const originalWrite = process.stdout.write.bind(process.stdout);
let logFile;
process.stdout.write = (chunk, ...args) => {
  if (logFile) fs.appendFileSync(logFile, chunk);
  return originalWrite(chunk, ...args);
};
(async () => {
  const results = [];
  console.log('Run output: ' + output);
  for (const region of Object.keys(REGION_CONFIG)) {
    logFile = path.join(output, region + '.log');
    const started = new Date().toISOString();
    try {
      const options = lib.parseCliArgs(['--region', region]);
      options.batchId = 'local-scrape-' + region + '-' + stamp;
      lib.setPipelineRegion(region, options.batchId);
      const rows = await run(options);
      const counts = rows.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
      results.push({ region, started, finished: new Date().toISOString(), success: true, updatedRows: rows.length, statuses: counts });
    } catch (error) {
      console.log('REGION FAILED: ' + region + ': ' + error.message);
      results.push({ region, started, finished: new Date().toISOString(), success: false, error: error.message });
    }
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(results, null, 2));
  }
  logFile = null;
  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.some(r => !r.success) ? 1 : 0;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
