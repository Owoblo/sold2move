#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const scriptsDir = __dirname;
const raw = process.argv.slice(2);
const laneArgIndex = raw.indexOf('--lanes');
const lanes = laneArgIndex >= 0 ? raw[laneArgIndex + 1].split(',').map(value => value.trim())
  : ['residential', 'rental', 'commercial'];
const load = raw.includes('--load');
const residentialArgs = raw.filter((value, index) =>
  value !== '--load' && value !== '--lanes' && index !== laneArgIndex + 1
);

function run(label, script, args = []) {
  console.log(`\n========== ${label} ==========`);
  const result = spawnSync(process.execPath, [path.join(scriptsDir, script), ...args], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`);
}

if (lanes.includes('residential')) run('Residential resale + postcard lane', 'postcard-pipeline.cjs', residentialArgs);
if (lanes.includes('rental')) {
  run('Rental turnover intelligence lane', 'rental-pipeline.cjs');
  if (load) run('Load rental intelligence', 'load-rental-snapshot.cjs');
}
if (lanes.includes('commercial')) {
  run('Commercial relocation intelligence lane', 'commercial-pipeline.cjs');
  if (load) run('Load commercial intelligence', 'load-commercial-snapshot.cjs');
}

console.log(`\nAll requested market lanes completed: ${lanes.join(', ')}`);
