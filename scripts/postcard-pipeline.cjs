#!/usr/bin/env node

const {
  parseCliArgs,
  ensurePipelineDir,
  setPipelineRegion,
  readPipelineFile,
  writePipelineFile,
  getRegionConfig,
} = require('./postcard-lib.cjs');

async function runPipeline(rawArgs) {
  const options = parseCliArgs(rawArgs);
  const regionConfig = getRegionConfig(options.region);
  options.batchId = options.batchId || `${regionConfig.key}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

  setPipelineRegion(regionConfig.key);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║ ${regionConfig.label.padEnd(56, ' ')} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Date range: ${options.from} to ${options.to}`);
  console.log(`  Min price: $${options.minPrice.toLocaleString()}`);
  console.log(`  Statuses: ${options.statuses.join(', ')}`);
  console.log(`  Region: ${regionConfig.key}`);
  console.log(`  Batch ID: ${options.batchId}`);
  console.log(`  Cities: ${options.cities.slice(0, 5).join(', ')}${options.cities.length > 5 ? ` ... (${options.cities.length} total)` : ''}`);
  console.log(`  Skip scrape: ${options.skipScrape}`);
  console.log(`  Skip photos: ${options.skipPhotos}`);
  console.log(`  Skip furniture: ${options.skipFurniture}`);
  console.log(`  Skip geocode: ${options.skipGeocode}`);
  console.log(`  Include unscanned: ${options.includeUnscanned}`);
  console.log(`  Dry run: ${options.dryRun}`);

  ensurePipelineDir();
  const startTime = Date.now();

  if (!options.skipScrape) {
    const step0 = require('./postcard-step0-scrape.cjs');
    await step0.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 0: Scrape (--skip-scrape)');
  }

  const step1 = require('./postcard-step1-filter.cjs');
  const filtered = await step1.run(options);

  if (filtered.length === 0) {
    console.log('\nNo listings found matching criteria. Pipeline complete.');
    return [];
  }

  if (!options.skipPhotos) {
    const step2 = require('./postcard-step2-photos.cjs');
    await step2.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 2: Fetch Photos (--skip-photos)');
    writePipelineFile('step2-photos.json', readPipelineFile('step1-filtered.json'));
  }

  if (!options.skipFurniture) {
    const step3 = require('./postcard-step3-furniture.cjs');
    await step3.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 3: Furniture Check (--skip-furniture)');
    writePipelineFile('step3-furniture.json', readPipelineFile('step2-photos.json'));
  }

  if (!options.skipGeocode) {
    const step4 = require('./postcard-step4-geocode.cjs');
    await step4.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 4: Address Verification (--skip-geocode)');
    writePipelineFile('step4-verified.json', readPipelineFile('step3-furniture.json'));
  }

  const step5 = require('./postcard-step5-output.cjs');
  const finalListings = await step5.run(options);

  const step6 = require('./postcard-step6-archive.cjs');
  await step6.run(options, finalListings || []);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Pipeline complete in ${elapsed}s`);
  console.log(`  Output prefix: ${regionConfig.outputPrefix}`);
  console.log(`${'='.repeat(60)}`);

  return finalListings || [];
}

if (require.main === module) {
  runPipeline(process.argv.slice(2)).catch(err => {
    console.error('\nPipeline failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { runPipeline };
