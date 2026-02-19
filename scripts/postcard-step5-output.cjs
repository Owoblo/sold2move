#!/usr/bin/env node
/**
 * Step 5: Generate Output
 *
 * - Filters to verified addresses + furnished homes
 * - --include-unscanned flag includes homes without furniture scan
 * - Generates filtered CSV
 * - Generates print-ready PDF postcards (same approach as generate-postcards-pdf.cjs)
 *
 * Output: Windsor_Postcards_YYYY-MM-DD.csv + .pdf in project root
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const {
  readPipelineFile,
  stepHeader,
  parseCliArgs,
} = require('./postcard-lib.cjs');

// Postcard dimensions: 9.5" x 4.125"
const PAGE_WIDTH = 9.5 * 72;
const PAGE_HEIGHT = 4.125 * 72;
const MARGIN = 0.5 * 72;

const STAMP_PATH = '/tmp/dotx_extract/word/media/image1.jpeg';
const TEMPLATE_PATH = '/Users/admin/Downloads/Saturn Star Services - standard(home.dotx';

async function getStampImage() {
  if (fs.existsSync(STAMP_PATH)) {
    return fs.readFileSync(STAMP_PATH);
  }
  try {
    const JSZip = require('jszip');
    if (fs.existsSync(TEMPLATE_PATH)) {
      const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
      const zip = await JSZip.loadAsync(templateBuffer);
      const imageFile = zip.file('word/media/image1.jpeg');
      if (imageFile) return await imageFile.async('nodebuffer');
    }
  } catch (e) {
    // Stamp is optional
  }
  return null;
}

/**
 * Apply final filters to determine which listings get postcards
 */
function applyOutputFilters(listings, opts) {
  let filtered = [...listings];

  // Filter to verified addresses (if geocoding was run)
  const hasGeocode = listings.some(l => l._geocode_verified != null);
  if (hasGeocode) {
    const beforeGeo = filtered.length;
    filtered = filtered.filter(l => l._geocode_verified === true || l._geocode_verified == null);
    const removedGeo = beforeGeo - filtered.length;
    if (removedGeo > 0) {
      console.log(`  Removed ${removedGeo} listings with address mismatches`);
    }
  }

  // Filter to furnished homes (if furniture check was run)
  const hasFurnitureScan = listings.some(l => l.is_furnished != null);
  if (hasFurnitureScan) {
    const beforeFurn = filtered.length;
    if (opts.includeUnscanned) {
      // Keep furnished + unscanned, remove unfurnished
      filtered = filtered.filter(l => l.is_furnished === true || l.is_furnished == null);
      console.log(`  Including unscanned homes (--include-unscanned)`);
    } else {
      // Keep only confirmed furnished
      filtered = filtered.filter(l => l.is_furnished === true);
    }
    const removedFurn = beforeFurn - filtered.length;
    if (removedFurn > 0) {
      console.log(`  Removed ${removedFurn} unfurnished/unscanned listings`);
    }
  }

  return filtered;
}

/**
 * Generate CSV file
 */
function generateCSV(listings, outputPath) {
  const csvData = listings.map(l => ({
    zpid: l.zpid,
    status: l.status,
    addressstreet: l.addressstreet,
    city: l.city || l.addresscity,
    addressstate: l.addressstate || 'ON',
    addresszipcode: l.addresszipcode,
    price: l.price,
    beds: l.beds,
    baths: l.baths,
    area: l.area,
    is_furnished: l.is_furnished != null ? (l.is_furnished ? 'Yes' : 'No') : 'Unknown',
    furniture_confidence: l.furniture_confidence != null ? l.furniture_confidence.toFixed(2) : '',
    address_verified: l._geocode_verified != null ? (l._geocode_verified ? 'Yes' : 'No') : 'Not checked',
    lastseenat: l.lastseenat,
  }));

  const csv = Papa.unparse(csvData);
  fs.writeFileSync(outputPath, csv);
  console.log(`  CSV: ${path.basename(outputPath)} (${listings.length} records)`);
}

/**
 * Generate PDF postcards
 */
async function generatePDF(listings, outputPath) {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const addressFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // Load stamp
  const stampBytes = await getStampImage();
  let stampImage = null;
  if (stampBytes) {
    try {
      stampImage = await pdfDoc.embedJpg(stampBytes);
    } catch (e) {
      // Stamp embedding failed, continue without
    }
  }

  for (let i = 0; i < listings.length; i++) {
    const row = listings[i];
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Return address (top-left)
    const returnFontSize = 9;
    const returnLineHeight = 12;
    let returnY = PAGE_HEIGHT - MARGIN;

    page.drawText('Saturn Star Services', {
      x: MARGIN, y: returnY, size: returnFontSize, font: boldFont, color: rgb(0, 0, 0),
    });
    returnY -= returnLineHeight;

    page.drawText('1487 Ouellette Avenue, G Floor', {
      x: MARGIN, y: returnY, size: returnFontSize, font: boldFont, color: rgb(0, 0, 0),
    });
    returnY -= returnLineHeight;

    page.drawText('Windsor, ON N1G 1C4', {
      x: MARGIN, y: returnY, size: returnFontSize, font: boldFont, color: rgb(0, 0, 0),
    });

    // Stamp (top-right)
    if (stampImage) {
      const stampWidth = 90;
      const stampHeight = 62;
      page.drawImage(stampImage, {
        x: PAGE_WIDTH - MARGIN - stampWidth,
        y: PAGE_HEIGHT - MARGIN - stampHeight + 10,
        width: stampWidth,
        height: stampHeight,
      });
    }

    // Recipient address (centered)
    const addrFontSize = 16;
    const addrLineHeight = 22;

    const name = 'Homeowner';
    const street = row.addressstreet || '';
    const city = row.city || row.addresscity || '';
    const province = row.addressstate || 'ON';
    const postal = row.addresszipcode || '';
    const cityLine = [city, province, postal].filter(Boolean).join(', ').replace(', ,', ',');
    const lines = [name, street, cityLine].filter(Boolean);

    const totalTextHeight = lines.length * addrLineHeight;
    let addrY = (PAGE_HEIGHT / 2) + (totalTextHeight / 2) - 10;

    for (const line of lines) {
      const textWidth = addressFont.widthOfTextAtSize(line, addrFontSize);
      const textX = (PAGE_WIDTH - textWidth) / 2;
      page.drawText(line, {
        x: textX, y: addrY, size: addrFontSize, font: addressFont, color: rgb(0, 0, 0),
      });
      addrY -= addrLineHeight;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${listings.length} postcards...`);
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`  PDF: ${path.basename(outputPath)} (${listings.length} postcards)`);
}

async function run(options) {
  stepHeader(5, 'Generate Output');

  const opts = options || parseCliArgs();

  // Try step4 first, fall back to step3, step2, step1
  let listings;
  const fallbackFiles = ['step4-verified.json', 'step3-furniture.json', 'step2-photos.json', 'step1-filtered.json'];
  for (const file of fallbackFiles) {
    try {
      listings = readPipelineFile(file);
      console.log(`  Loaded ${listings.length} listings from ${file}`);
      break;
    } catch (e) {
      // Try next file
    }
  }

  if (!listings) {
    console.error('  No pipeline data found. Run at least Step 1 first.');
    process.exit(1);
  }

  // Apply filters
  const finalListings = applyOutputFilters(listings, opts);
  console.log(`\n  Final postcard count: ${finalListings.length}`);

  if (finalListings.length === 0) {
    console.log('  No listings passed all filters. Nothing to generate.');
    return [];
  }

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would generate CSV + PDF for these listings.');
    return finalListings;
  }

  // Generate outputs
  const dateStr = new Date().toISOString().split('T')[0];
  const projectRoot = path.join(__dirname, '..');
  const csvPath = path.join(projectRoot, `Windsor_Postcards_${dateStr}.csv`);
  const pdfPath = path.join(projectRoot, `Windsor_Postcards_${dateStr}.pdf`);

  generateCSV(finalListings, csvPath);
  await generatePDF(finalListings, pdfPath);

  // Summary
  const statusCounts = {};
  finalListings.forEach(l => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  console.log('\n  === Output Summary ===');
  console.log(`  Total postcards: ${finalListings.length}`);
  Object.entries(statusCounts).forEach(([s, c]) => console.log(`    ${s}: ${c}`));
  console.log(`  CSV: ${csvPath}`);
  console.log(`  PDF: ${pdfPath}`);

  return finalListings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 5 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
