/**
 * Shared utilities for the Windsor Postcard Pipeline
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Windsor-area cities for filtering
const WINDSOR_CITIES = [
  'Windsor', 'Essex', 'Tecumseh', 'Amherstburg', 'Lakeshore',
  'Chatham-Kent', 'LaSalle', 'Leamington', 'Kingsville', 'Tilbury',
];

// Pipeline data directory
const PIPELINE_DIR = path.join(__dirname, '.pipeline');

/**
 * Initialize Supabase client
 */
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  }
  return createClient(url, key);
}

/**
 * Rate limiter - ensures minimum delay between calls
 * @param {number} delayMs - Minimum milliseconds between calls
 * @returns {function} - Async function that waits if needed before resolving
 */
function createRateLimiter(delayMs) {
  let lastCall = 0;
  return async function waitForRate() {
    const now = Date.now();
    const elapsed = now - lastCall;
    if (elapsed < delayMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs - elapsed));
    }
    lastCall = Date.now();
  };
}

/**
 * Ensure the pipeline directory exists
 */
function ensurePipelineDir() {
  if (!fs.existsSync(PIPELINE_DIR)) {
    fs.mkdirSync(PIPELINE_DIR, { recursive: true });
  }
}

/**
 * Read a pipeline step file
 * @param {string} filename - e.g. 'step1-filtered.json'
 * @returns {Array} parsed JSON array
 */
function readPipelineFile(filename) {
  const filepath = path.join(PIPELINE_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Pipeline file not found: ${filepath}\nRun the previous step first.`);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

/**
 * Write a pipeline step file
 * @param {string} filename - e.g. 'step1-filtered.json'
 * @param {Array} data - JSON-serializable array
 */
function writePipelineFile(filename, data) {
  ensurePipelineDir();
  const filepath = path.join(PIPELINE_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  Wrote ${data.length} records to ${path.relative(process.cwd(), filepath)}`);
}

/**
 * Format an address from listing fields
 */
function formatAddress(listing) {
  const parts = [
    listing.addressstreet,
    listing.addresscity || listing.city,
    listing.addressstate || 'ON',
    listing.addresszipcode,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Parse CLI args into an options object
 * Supports: --from, --to, --skip-photos, --skip-furniture, --skip-geocode,
 *           --include-unscanned, --min-price, --status, --dry-run
 */
function parseCliArgs(argv) {
  const args = argv || process.argv.slice(2);
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const options = {
    from: weekAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
    skipPhotos: false,
    skipFurniture: false,
    skipGeocode: false,
    includeUnscanned: false,
    minPrice: 375000,
    statuses: ['sold', 'just_listed'],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--from':
        options.from = args[++i];
        break;
      case '--to':
        options.to = args[++i];
        break;
      case '--skip-photos':
        options.skipPhotos = true;
        break;
      case '--skip-furniture':
        options.skipFurniture = true;
        break;
      case '--skip-geocode':
        options.skipGeocode = true;
        break;
      case '--include-unscanned':
        options.includeUnscanned = true;
        break;
      case '--min-price':
        options.minPrice = parseInt(args[++i], 10);
        break;
      case '--status':
        options.statuses = args[++i].split(',').map(s => s.trim());
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  return options;
}

/**
 * Print a step header
 */
function stepHeader(stepNum, title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Step ${stepNum}: ${title}`);
  console.log(`${'='.repeat(60)}`);
}

module.exports = {
  WINDSOR_CITIES,
  PIPELINE_DIR,
  getSupabase,
  createRateLimiter,
  ensurePipelineDir,
  readPipelineFile,
  writePipelineFile,
  formatAddress,
  parseCliArgs,
  stepHeader,
};
