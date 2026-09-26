#!/usr/bin/env node
// Read saved Apify datasets only. Does not launch actors or change listing history.
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN is required');
  const output = path.resolve('reports/postcard-inventory-recovery');
  fs.mkdirSync(output, { recursive: true });
  const report = { recovered_at: new Date().toISOString(), runs: [] };
  async function get(route) {
    const response = await fetch(`https://api.apify.com/v2/${route}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Apify GET ${route.split('?')[0]} returned HTTP ${response.status}`);
    return response.json();
  }
  for (const [label, id] of [['current', process.env.RECOVERY_RUN_ID], ['previous', process.env.RECOVERY_PREVIOUS_RUN_ID]]) {
    if (!id && label === 'previous') continue;
    if (!id || !/^[a-zA-Z0-9]{10,30}$/.test(id)) throw new Error(`Invalid ${label} run ID`);
    try {
      const { data: run } = await get(`actor-runs/${id}`);
      if (run.status !== 'SUCCEEDED' || !run.defaultDatasetId) throw new Error(`Saved run ${id} is not a successful dataset`);
      const { data: dataset } = await get(`datasets/${run.defaultDatasetId}`);
      if (!Number.isInteger(dataset.itemCount) || dataset.itemCount < 1 || dataset.itemCount > 100000) {
        throw new Error('Dataset item count is empty, invalid or exceeds the recovery limit');
      }
      const rows = [];
      while (rows.length < dataset.itemCount) {
        const page = await get(`datasets/${run.defaultDatasetId}/items?format=json&offset=${rows.length}&limit=1000`);
        if (!Array.isArray(page) || !page.length) throw new Error('Dataset ended before all records were recovered');
        rows.push(...page);
      }
      if (rows.length !== dataset.itemCount) throw new Error('Recovered count differs from saved dataset count');
      fs.writeFileSync(path.join(output, `${label}-inventory.json`), JSON.stringify(rows));
      report.runs.push({ label, id, status: run.status, actor_id: run.actId, dataset_id: run.defaultDatasetId,
        started_at: run.startedAt, finished_at: run.finishedAt, count: rows.length });
    } catch (error) {
      report.runs.push({ label, id, error: error.message });
      if (label === 'current') throw error;
    } finally {
      fs.writeFileSync(path.join(output, 'recovery-summary.json'), JSON.stringify(report, null, 2));
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
