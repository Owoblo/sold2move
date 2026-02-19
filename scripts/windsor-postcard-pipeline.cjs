#!/usr/bin/env node
/**
 * Windsor Postcard Pipeline - Orchestrator
 *
 * Runs all 5 pipeline steps in sequence to generate print-ready postcards
 * for Windsor-area real estate listings.
 *
 * Usage:
 *   node scripts/windsor-postcard-pipeline.cjs [options]
 *
 * Options:
 *   --from YYYY-MM-DD       Start date (default: 7 days ago)
 *   --to YYYY-MM-DD         End date (default: today)
 *   --skip-photos           Skip photo fetching (use cached only)
 *   --skip-furniture        Skip furniture detection
 *   --skip-geocode          Skip address verification
 *   --include-unscanned     Include homes without furniture scan in output
 *   --min-price N           Override minimum price (default: 375000)
 *   --status sold,just_listed  Filter by status
 *   --dry-run               Show what would be processed without API calls
 */

const { parseCliArgs, ensurePipelineDir, PIPELINE_DIR } = require('./postcard-lib.cjs');

async function main() {
  const options = parseCliArgs();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         Windsor Postcard Pipeline                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Date range: ${options.from} to ${options.to}`);
  console.log(`  Min price: $${options.minPrice.toLocaleString()}`);
  console.log(`  Statuses: ${options.statuses.join(', ')}`);
  console.log(`  Skip photos: ${options.skipPhotos}`);
  console.log(`  Skip furniture: ${options.skipFurniture}`);
  console.log(`  Skip geocode: ${options.skipGeocode}`);
  console.log(`  Include unscanned: ${options.includeUnscanned}`);
  console.log(`  Dry run: ${options.dryRun}`);

  ensurePipelineDir();
  const startTime = Date.now();

  // Step 1: Filter Listings (always runs)
  const step1 = require('./postcard-step1-filter.cjs');
  const filtered = await step1.run(options);

  if (filtered.length === 0) {
    console.log('\nNo listings found matching criteria. Pipeline complete.');
    return;
  }

  // Step 2: Fetch Photos
  if (!options.skipPhotos) {
    const step2 = require('./postcard-step2-photos.cjs');
    await step2.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 2: Fetch Photos (--skip-photos)');
    // Copy step1 output to step2 for downstream steps
    const { readPipelineFile, writePipelineFile } = require('./postcard-lib.cjs');
    writePipelineFile('step2-photos.json', readPipelineFile('step1-filtered.json'));
  }

  // Step 3: Furniture Check
  if (!options.skipFurniture) {
    const step3 = require('./postcard-step3-furniture.cjs');
    await step3.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 3: Furniture Check (--skip-furniture)');
    const { readPipelineFile, writePipelineFile } = require('./postcard-lib.cjs');
    writePipelineFile('step3-furniture.json', readPipelineFile('step2-photos.json'));
  }

  // Step 4: Address Verification
  if (!options.skipGeocode) {
    const step4 = require('./postcard-step4-geocode.cjs');
    await step4.run(options);
  } else {
    console.log('\n  [SKIPPED] Step 4: Address Verification (--skip-geocode)');
    const { readPipelineFile, writePipelineFile } = require('./postcard-lib.cjs');
    writePipelineFile('step4-verified.json', readPipelineFile('step3-furniture.json'));
  }

  // Step 5: Generate Output (always runs)
  const step5 = require('./postcard-step5-output.cjs');
  await step5.run(options);

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Pipeline complete in ${elapsed}s`);
  console.log(`  Pipeline data: ${PIPELINE_DIR}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(err => {
  console.error('\nPipeline failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
