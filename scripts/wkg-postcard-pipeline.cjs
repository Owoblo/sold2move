#!/usr/bin/env node

const { runPipeline } = require('./postcard-pipeline.cjs');

runPipeline([...process.argv.slice(2), '--region', 'wkg']).catch(err => {
  console.error('\nPipeline failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
