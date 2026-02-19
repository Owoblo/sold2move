/**
 * Generate print-ready postcard PDFs directly from CSV listing data
 * No Word/LibreOffice needed - generates PDF directly
 *
 * Usage:
 *   node scripts/generate-postcards-pdf.cjs <csv-file> [options]
 *
 * Options:
 *   --status sold,just_listed    Filter by status (default: all)
 *   --name "Homeowner"           Recipient name (default: "Homeowner")
 *   --output <path>              Output file path
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

// Postcard dimensions: 9.5" x 4.125" (matches the .dotx template)
const PAGE_WIDTH = 9.5 * 72;   // 684 points
const PAGE_HEIGHT = 4.125 * 72; // 297 points
const MARGIN = 0.5 * 72;        // 36 points (0.5 inch)

const STAMP_PATH = '/tmp/dotx_extract/word/media/image1.jpeg';
// Fallback: extract from template if not already extracted
const TEMPLATE_PATH = '/Users/admin/Downloads/Saturn Star Services - standard(home.dotx';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    csvPath: null,
    statuses: null,
    recipientName: 'Homeowner',
    outputPath: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--status' && args[i + 1]) {
      options.statuses = args[++i].split(',').map(s => s.trim());
    } else if (args[i] === '--name' && args[i + 1]) {
      options.recipientName = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (!args[i].startsWith('--')) {
      options.csvPath = args[i];
    }
  }

  if (!options.csvPath) {
    console.error('Usage: node scripts/generate-postcards-pdf.cjs <csv-file> [--status sold,just_listed] [--name "Homeowner"]');
    process.exit(1);
  }

  if (!path.isAbsolute(options.csvPath)) {
    options.csvPath = path.join(process.cwd(), options.csvPath);
  }

  if (!options.outputPath) {
    const csvStem = path.basename(options.csvPath, path.extname(options.csvPath));
    options.outputPath = path.join(path.dirname(options.csvPath), `${csvStem}_postcards.pdf`);
  }

  return options;
}

async function getStampImage() {
  // Try pre-extracted stamp first
  if (fs.existsSync(STAMP_PATH)) {
    return fs.readFileSync(STAMP_PATH);
  }

  // Extract from template
  const JSZip = require('jszip');
  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(templateBuffer);
  const imageFile = zip.file('word/media/image1.jpeg');
  if (imageFile) {
    return await imageFile.async('nodebuffer');
  }
  return null;
}

async function generatePDF(options) {
  // Read and parse CSV
  console.log(`Reading CSV: ${path.basename(options.csvPath)}`);
  const csvContent = fs.readFileSync(options.csvPath, 'utf-8');
  const { data } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

  // Filter by status
  let records = data;
  if (options.statuses) {
    records = data.filter(row => options.statuses.includes(row.status));
    console.log(`Filtered: ${records.length} records (${options.statuses.join(', ')})`);
  } else {
    console.log(`All records: ${records.length}`);
  }

  // Filter out records with missing addresses
  records = records.filter(row => row.addressstreet && row.addressstreet.trim());
  console.log(`Valid addresses: ${records.length}`);

  if (records.length === 0) {
    console.error('No records to process.');
    process.exit(1);
  }

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  // Use Courier as a handwritten-style substitute (closest standard font with character)
  // For the recipient address, we'll use a slightly different style
  const addressFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // Load stamp image
  const stampBytes = await getStampImage();
  let stampImage = null;
  if (stampBytes) {
    stampImage = await pdfDoc.embedJpg(stampBytes);
  }

  // Generate each postcard
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // === RETURN ADDRESS (top-left) ===
    const returnFontSize = 9;
    const returnLineHeight = 12;
    let returnY = PAGE_HEIGHT - MARGIN;

    page.drawText('Saturn Star Services', {
      x: MARGIN,
      y: returnY,
      size: returnFontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    returnY -= returnLineHeight;

    page.drawText('1487 Ouellette Avenue, G Floor', {
      x: MARGIN,
      y: returnY,
      size: returnFontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    returnY -= returnLineHeight;

    page.drawText('Windsor, ON N1G 1C4', {
      x: MARGIN,
      y: returnY,
      size: returnFontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // === STAMP IMAGE (top-right) ===
    if (stampImage) {
      const stampWidth = 90;
      const stampHeight = 62;
      const stampX = PAGE_WIDTH - MARGIN - stampWidth;
      const stampY = PAGE_HEIGHT - MARGIN - stampHeight + 10;
      page.drawImage(stampImage, {
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
      });
    }

    // === RECIPIENT ADDRESS (centered) ===
    const addrFontSize = 16;
    const addrLineHeight = 22;

    // Build address lines
    const name = options.recipientName;
    const street = row.addressstreet || '';
    const city = row.city || '';
    const province = row.addressstate || 'ON';
    const postal = row.addresszipcode || '';
    const cityLine = [city, province, postal].filter(Boolean).join(', ').replace(', ,', ',');

    const lines = [name, street, cityLine].filter(Boolean);

    // Calculate vertical center
    const totalTextHeight = lines.length * addrLineHeight;
    let addrY = (PAGE_HEIGHT / 2) + (totalTextHeight / 2) - 10;

    for (const line of lines) {
      const textWidth = addressFont.widthOfTextAtSize(line, addrFontSize);
      const textX = (PAGE_WIDTH - textWidth) / 2;

      page.drawText(line, {
        x: textX,
        y: addrY,
        size: addrFontSize,
        font: addressFont,
        color: rgb(0, 0, 0),
      });
      addrY -= addrLineHeight;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${records.length} postcards...`);
    }
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(options.outputPath, pdfBytes);

  // Summary
  const statusCounts = {};
  records.forEach(r => {
    const s = r.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  console.log('\n=== PDF Postcard Generation Complete ===');
  console.log(`Total postcards: ${records.length}`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log(`Recipient: "${options.recipientName}"`);
  console.log(`Output: ${options.outputPath}`);
}

const options = parseArgs();
generatePDF(options).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
