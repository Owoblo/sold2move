#!/usr/bin/env node
/**
 * Standalone premium-envelope layout sandbox.
 *
 * This intentionally does not import, modify, or participate in the postcard
 * pipeline. It starts with the pipeline's current PDF/address logic so the
 * envelope layout can evolve independently.
 *
 * Usage:
 *   node scripts/generate-premium-envelopes.cjs <csv-file> [options]
 *
 * Options:
 *   --status sold,just_listed  Filter by status (default: all)
 *   --name "Jane Smith"        Optional recipient name (omitted by default)
 *   --logo <path>             Override the navy Saturn Star wordmark
 *   --brand lockup|icon       Brand treatment (default: lockup)
 *   --address centered|editorial  Address composition (default: centered)
 *   --editorial-side left|right  Editorial address axis (default: left)
 *   --back                    Add a coordinated envelope-back page
 *   --paper-stock             Do not print a background fill; use the physical
 *                             envelope stock as the background (no white edge)
 *   --front-return            Print the region return address below the logo
 *   --region windsor          Return-address region (default: windsor)
 *   --output <path>           Output PDF path
 */

const { PDFDocument, BlendMode, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');
const {
  formatCanadianPostal,
  getRegionConfig,
} = require('./postcard-lib.cjs');

// Landscape premium envelope: 7.25 inches wide by 5.25 inches tall.
const LAYOUT = Object.freeze({
  pageWidth: 7.25 * 72,
  pageHeight: 5.25 * 72,
  outerMargin: 0.48 * 72,
  iconSize: 0.72 * 72,
  iconOnlySize: 0.9405 * 72,
  wordmarkWidth: 1.62 * 72,
  wordmarkHeight: 0.54 * 72,
  // Negative box gap compensates for transparent padding baked into both PNGs.
  // The resulting visible gap is approximately one wordmark "S" character.
  logoGap: -0.08 * 72,
  stampWidth: 1.28 * 72,
  stampHeight: 0.96 * 72,
  stampOffsetX: -2.5 * 72 / 25.4,
  stampOffsetY: -2.5 * 72 / 25.4,
  addressFontSize: 13.5,
  nameFontSize: 12,
  cityFontSize: 12.5,
  addressLineHeight: 20,
  addressShiftX: 0,
  addressShiftY: -5 * 72 / 25.4,
});

const COLORS = Object.freeze({
  navy: rgb(7 / 255, 20 / 255, 33 / 255),
  gold: rgb(201 / 255, 151 / 255, 0),
  ivory: rgb(247 / 255, 244 / 255, 237 / 255),
});

const DEFAULT_LOGO_PATH = path.join(__dirname, 'assets', 'brand-svg', 'SaturnStarMovers_Wordmark_DeepNavy_NoDescriptor.png');
const DEFAULT_ICON_PATH = path.join(__dirname, 'assets', 'brand-svg', 'SaturnStarMovers_Icon_FullColor.png');
const INTER_REGULAR_FONT_PATH = path.join(__dirname, 'assets', 'Inter-Regular.ttf');
const INTER_SEMIBOLD_FONT_PATH = path.join(__dirname, 'assets', 'Inter-SemiBold.ttf');
const STAMP_PATHS = [
  path.join(__dirname, 'assets', 'canada-post-stamp.jpeg'),
  '/tmp/dotx_extract/word/media/image1.jpeg',
];

function parseArgs(args = process.argv.slice(2)) {
  const options = {
    csvPath: null,
    statuses: null,
    recipientName: null,
    logoPath: DEFAULT_LOGO_PATH,
    brandTreatment: 'lockup',
    addressTreatment: 'centered',
    editorialSide: 'left',
    includeBack: false,
    usePaperStock: false,
    includeFrontReturn: false,
    region: 'windsor',
    outputPath: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--status' && args[i + 1]) {
      options.statuses = args[++i].split(',').map(value => value.trim());
    } else if (args[i] === '--name' && args[i + 1]) {
      options.recipientName = args[++i];
    } else if (args[i] === '--logo' && args[i + 1]) {
      options.logoPath = path.resolve(args[++i]);
    } else if (args[i] === '--brand' && args[i + 1]) {
      options.brandTreatment = args[++i];
    } else if (args[i] === '--address' && args[i + 1]) {
      options.addressTreatment = args[++i];
    } else if (args[i] === '--editorial-side' && args[i + 1]) {
      options.editorialSide = args[++i];
    } else if (args[i] === '--back') {
      options.includeBack = true;
    } else if (args[i] === '--paper-stock') {
      options.usePaperStock = true;
    } else if (args[i] === '--front-return') {
      options.includeFrontReturn = true;
    } else if (args[i] === '--region' && args[i + 1]) {
      options.region = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (!args[i].startsWith('--')) {
      options.csvPath = args[i];
    }
  }

  if (!options.csvPath) {
    throw new Error('Usage: node scripts/generate-premium-envelopes.cjs <csv-file> [--logo <path>] [--output <path>]');
  }

  options.csvPath = path.resolve(options.csvPath);
  if (!['lockup', 'icon'].includes(options.brandTreatment)) {
    throw new Error('--brand must be either "lockup" or "icon"');
  }
  if (!['centered', 'editorial'].includes(options.addressTreatment)) {
    throw new Error('--address must be either "centered" or "editorial"');
  }
  if (!['left', 'right'].includes(options.editorialSide)) {
    throw new Error('--editorial-side must be either "left" or "right"');
  }
  if (!options.outputPath) {
    const stem = path.basename(options.csvPath, path.extname(options.csvPath));
    options.outputPath = path.join(path.dirname(options.csvPath), `${stem}_premium_envelopes_TEST.pdf`);
  } else {
    options.outputPath = path.resolve(options.outputPath);
  }

  return options;
}

function titleCaseAddress(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, lead, letter) => `${lead}${letter.toUpperCase()}`);
}

function getStampImage() {
  for (const stampPath of STAMP_PATHS) {
    if (fs.existsSync(stampPath)) return fs.readFileSync(stampPath);
  }
  return null;
}

function trackedTextWidth(font, text, size, tracking) {
  return font.widthOfTextAtSize(text, size) + (Math.max(0, text.length - 1) * tracking);
}

function drawTrackedText(page, text, options) {
  let x = options.x;
  for (const character of text) {
    page.drawText(character, { ...options, x });
    x += options.font.widthOfTextAtSize(character, options.size) + options.tracking;
  }
}

function drawEnvelopeBack(pdfDoc, iconImage, addressFont, emphasisFont, options) {
  const page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);
  if (!options.usePaperStock) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: LAYOUT.pageWidth,
      height: LAYOUT.pageHeight,
      color: COLORS.ivory,
    });
  }

  // Temporary flap seam for the proof: a restrained V makes page 2 read
  // immediately as the envelope back without turning the seam into decoration.
  const flapApexY = LAYOUT.pageHeight * 0.49;
  page.drawLine({
    start: { x: 0, y: LAYOUT.pageHeight - (0.18 * 72) },
    end: { x: LAYOUT.pageWidth / 2, y: flapApexY },
    thickness: 1.1,
    color: COLORS.gold,
    opacity: 0.42,
  });
  page.drawLine({
    start: { x: LAYOUT.pageWidth, y: LAYOUT.pageHeight - (0.18 * 72) },
    end: { x: LAYOUT.pageWidth / 2, y: flapApexY },
    thickness: 1.1,
    color: COLORS.gold,
    opacity: 0.42,
  });

  // The flap stays completely unprinted so a physical gold wax seal can own
  // the apex. The tagline begins below the fold as restrained editorial type.
  const slogan = 'MOVING WITH CARE, FROM CITY TO CITY.';
  const sloganSize = 7.5;
  const sloganTracking = 1.5; // +200 tracking at 7.5 pt
  const sloganWidth = trackedTextWidth(addressFont, slogan, sloganSize, sloganTracking);
  drawTrackedText(page, slogan, {
    x: (LAYOUT.pageWidth - sloganWidth) / 2,
    y: flapApexY - 24,
    size: sloganSize,
    font: addressFont,
    color: COLORS.navy,
    tracking: sloganTracking,
  });

  const regionConfig = getRegionConfig(options.region);
  const returnLines = [
    'SATURN STAR',
    ...regionConfig.returnAddressLines.slice(1).map(line => line.toUpperCase()),
  ];
  const returnSizes = [7.5, 7, 7];
  const returnFonts = [emphasisFont, addressFont, addressFont];
  const returnTracking = [1.2, 0.65, 0.65];
  const returnY = 0.72 * 72;

  returnLines.forEach((line, index) => {
    const width = trackedTextWidth(returnFonts[index], line, returnSizes[index], returnTracking[index]);
    drawTrackedText(page, line, {
      x: (LAYOUT.pageWidth - width) / 2,
      y: returnY - (index * 13),
      size: returnSizes[index],
      font: returnFonts[index],
      color: COLORS.navy,
      tracking: returnTracking[index],
    });
  });
}

function readRecords(options) {
  if (Array.isArray(options.records)) {
    return options.records.filter(row => row.addressstreet && String(row.addressstreet).trim());
  }
  const csv = fs.readFileSync(options.csvPath, 'utf8');
  const { data, errors } = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (errors.length) {
    throw new Error(`Could not parse CSV: ${errors[0].message}`);
  }

  return data.filter(row => {
    const hasAddress = row.addressstreet && row.addressstreet.trim();
    const hasRequestedStatus = !options.statuses || options.statuses.includes(row.status);
    return hasAddress && hasRequestedStatus;
  });
}

async function generatePremiumEnvelopes(options) {
  const records = readRecords(options);
  if (!records.length) throw new Error('No records with valid street addresses to process.');

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const addressFont = await pdfDoc.embedFont(fs.readFileSync(INTER_REGULAR_FONT_PATH));
  const emphasisFont = await pdfDoc.embedFont(fs.readFileSync(INTER_SEMIBOLD_FONT_PATH));
  let wordmarkImage = null;
  let iconImage = null;
  let stampImage = null;

  if (options.logoPath && fs.existsSync(options.logoPath)) {
    wordmarkImage = await pdfDoc.embedPng(fs.readFileSync(options.logoPath));
  } else {
    console.warn('Saturn Star wordmark not found; continuing without it.');
  }
  if (fs.existsSync(DEFAULT_ICON_PATH)) {
    iconImage = await pdfDoc.embedPng(fs.readFileSync(DEFAULT_ICON_PATH));
  } else {
    console.warn('Saturn Star icon not found; continuing without it.');
  }
  const stampBytes = getStampImage();
  if (stampBytes) {
    stampImage = await pdfDoc.embedJpg(stampBytes);
  }

  let missingPostal = 0;
  for (const row of records) {
    const page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);
    if (!options.usePaperStock) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: LAYOUT.pageWidth,
        height: LAYOUT.pageHeight,
        color: COLORS.ivory,
      });
    }
    const iconSize = options.brandTreatment === 'icon'
      ? LAYOUT.iconOnlySize
      : LAYOUT.iconSize;
    if (iconImage) {
      page.drawImage(iconImage, {
        x: LAYOUT.outerMargin,
        y: LAYOUT.pageHeight - LAYOUT.outerMargin - iconSize,
        width: iconSize,
        height: iconSize,
      });
    }
    if (wordmarkImage && options.brandTreatment === 'lockup') {
      const wordmarkX = LAYOUT.outerMargin + LAYOUT.iconSize + LAYOUT.logoGap;
      const wordmarkY = LAYOUT.pageHeight - LAYOUT.outerMargin
        - ((LAYOUT.iconSize + LAYOUT.wordmarkHeight) / 2)
        + (options.includeFrontReturn ? 4.5 : 0);
      page.drawImage(wordmarkImage, {
        x: wordmarkX,
        y: wordmarkY,
        width: LAYOUT.wordmarkWidth,
        height: LAYOUT.wordmarkHeight,
      });
      // The supplied "Wordmark" asset includes a small MOVERS descriptor.
      // Mask only that lower descriptor so the premium face leads with the
      // Saturn Star brand, while preserving the official wordmark letterforms.
      // Do not paint an ivory masking patch when the physical stock supplies
      // the background; even a close colour match can reveal a printed box.
      if (!options.usePaperStock) {
        page.drawRectangle({
          x: wordmarkX,
          y: wordmarkY,
          width: LAYOUT.wordmarkWidth,
          height: LAYOUT.wordmarkHeight * 0.46,
          color: COLORS.ivory,
        });
      }
    }
    if (options.includeFrontReturn) {
      const regionConfig = getRegionConfig(options.region);
      const returnLines = regionConfig.returnAddressLines.slice(1).map(line => line.toUpperCase());
      // Compact stacked lockup: monogram at left; SATURN STAR above the local
      // return address at right. The wordmark's MOVERS descriptor is masked by
      // the stock-colour rectangle immediately above.
      const returnX = LAYOUT.outerMargin + LAYOUT.iconSize + LAYOUT.logoGap + 9;
      const returnY = LAYOUT.pageHeight - LAYOUT.outerMargin
        - ((LAYOUT.iconSize + LAYOUT.wordmarkHeight) / 2) + 10.5;
      returnLines.forEach((line, index) => {
        drawTrackedText(page, line, {
          x: returnX,
          y: returnY - (index * 8.25),
          size: 4.8,
          font: index === 0 ? emphasisFont : addressFont,
          color: COLORS.navy,
          tracking: 0.28,
        });
      });
    }
    if (stampImage) {
      page.drawImage(stampImage, {
        x: LAYOUT.pageWidth - LAYOUT.outerMargin - LAYOUT.stampWidth + LAYOUT.stampOffsetX,
        y: LAYOUT.pageHeight - LAYOUT.outerMargin - LAYOUT.stampHeight + LAYOUT.stampOffsetY,
        width: LAYOUT.stampWidth,
        height: LAYOUT.stampHeight,
        blendMode: BlendMode.Multiply,
      });
    }

    const name = options.recipientName
      ? (options.addressTreatment === 'editorial'
        ? options.recipientName.trim().toUpperCase()
        : titleCaseAddress(options.recipientName))
      : null;
    const street = titleCaseAddress(row.addressstreet);
    const city = titleCaseAddress(row.city || row.addresscity || '');
    const province = String(row.addressstate || 'ON').trim().toUpperCase();
    const postal = formatCanadianPostal(row.addresszipcode);
    if (!postal) missingPostal++;

    const cityLine = [city, province].filter(Boolean).join(', ')
      + (postal ? `  ${postal}` : '');
    const lines = name ? [name, street, cityLine] : [street, cityLine];
    const fontSizes = name
      ? [LAYOUT.nameFontSize, LAYOUT.addressFontSize, LAYOUT.cityFontSize]
      : [LAYOUT.addressFontSize, LAYOUT.cityFontSize];
    const fonts = name
      ? [emphasisFont, addressFont, addressFont]
      : [addressFont, addressFont];

    if (options.addressTreatment === 'editorial') {
      const editorialSizes = name ? [11, 10.5, 10.5] : [10.5, 10.5];
      const editorialTracking = name ? [0.7, 0.28, 0.28] : [0.28, 0.28];
      const editorialLeading = 18.5;
      const widths = lines.map((line, index) => trackedTextWidth(
        fonts[index], line, editorialSizes[index], editorialTracking[index],
      ));
      // Align the recipient axis to the monogram's visible left edge. The PNG
      // contains transparent padding, so the optical edge sits ~11 pt inside
      // the image box rather than at the configured outer margin.
      const addressX = options.editorialSide === 'right'
        ? 4.65 * 72
        : LAYOUT.outerMargin + 11.5;
      const addressY = 2.12 * 72;

      for (let index = 0; index < lines.length; index++) {
        drawTrackedText(page, lines[index], {
          x: addressX,
          y: addressY - (index * editorialLeading),
          size: editorialSizes[index],
          font: fonts[index],
          color: COLORS.navy,
          tracking: editorialTracking[index],
        });
      }
      if (options.includeBack) {
        drawEnvelopeBack(pdfDoc, iconImage, addressFont, emphasisFont, options);
      }
      continue;
    }

    let addressY = (LAYOUT.pageHeight * 0.43)
      + ((lines.length * LAYOUT.addressLineHeight) / 2)
      + LAYOUT.addressShiftY;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const font = fonts[index];
      const fontSize = fontSizes[index];
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      page.drawText(line, {
        x: ((LAYOUT.pageWidth - textWidth) / 2) + LAYOUT.addressShiftX,
        y: addressY - (index * LAYOUT.addressLineHeight),
        size: fontSize,
        font,
        color: COLORS.navy,
      });
    }
    if (options.includeBack) {
      drawEnvelopeBack(pdfDoc, iconImage, addressFont, emphasisFont, options);
    }
  }

  fs.writeFileSync(options.outputPath, await pdfDoc.save());
  console.log(`Premium envelope TEST PDF: ${options.outputPath}`);
  console.log(`Envelopes: ${records.length}`);
  if (missingPostal) console.warn(`Missing postal codes: ${missingPostal}`);
  return { outputPath: options.outputPath, count: records.length, missingPostal };
}

if (require.main === module) {
  let options;
  try {
    options = parseArgs();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  generatePremiumEnvelopes(options).catch(error => {
    console.error('Premium envelope generation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { LAYOUT, parseArgs, generatePremiumEnvelopes };
