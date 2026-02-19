/**
 * Generate print-ready postcards from CSV listing data
 * Uses the Saturn Star Services Word template (.dotx) and fills in addresses
 *
 * Usage:
 *   node scripts/generate-postcards.cjs <csv-file> [options]
 *
 * Options:
 *   --status sold,just_listed    Filter by status (default: all)
 *   --name "Current Resident"    Recipient name (default: "Current Resident")
 *   --output <path>              Output file path (default: <csv>_postcards.docx)
 *
 * Examples:
 *   node scripts/generate-postcards.cjs Windsor_Listings_Feb12-18.csv
 *   node scripts/generate-postcards.cjs Windsor_Listings_Feb12-18.csv --status sold
 *   node scripts/generate-postcards.cjs Windsor_Listings_Feb12-18.csv --status just_listed,sold --name "Homeowner"
 */

const JSZip = require('jszip');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

const TEMPLATE_PATH = '/Users/admin/Downloads/Saturn Star Services - standard(home.dotx';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    csvPath: null,
    statuses: null, // null = all statuses
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
    console.error('Usage: node scripts/generate-postcards.cjs <csv-file> [--status sold,just_listed] [--name "Current Resident"]');
    process.exit(1);
  }

  // Resolve CSV path relative to project root
  if (!path.isAbsolute(options.csvPath)) {
    options.csvPath = path.join(process.cwd(), options.csvPath);
  }

  // Default output path
  if (!options.outputPath) {
    const csvStem = path.basename(options.csvPath, path.extname(options.csvPath));
    options.outputPath = path.join(path.dirname(options.csvPath), `${csvStem}_postcards.docx`);
  }

  return options;
}

/**
 * Replace Word merge field complexes with actual values.
 * Merge fields in Word XML look like:
 *   <w:r><rPr/><w:fldChar fldCharType="begin"/></w:r>
 *   <w:r><rPr/><w:instrText> MERGEFIELD FieldName </w:instrText></w:r>
 *   [<w:r><rPr/><w:fldChar fldCharType="separate"/></w:r>
 *    <w:r><rPr/><w:t>SampleValue</w:t></w:r>]
 *   <w:r><rPr/><w:fldChar fldCharType="end"/></w:r>
 */
function replaceMergeFields(xml, fields) {
  // Find all begin/end fldChar positions with their enclosing <w:r> elements
  const runPattern = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
  const runs = [];
  let match;
  while ((match = runPattern.exec(xml)) !== null) {
    runs.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Identify merge field groups (begin -> end)
  const fieldGroups = [];
  let currentGroup = null;

  for (const run of runs) {
    if (run.text.includes('fldCharType="begin"')) {
      currentGroup = { beginRun: run, runs: [run], fieldName: null };
    } else if (currentGroup) {
      currentGroup.runs.push(run);

      // Check for field name
      const instrMatch = run.text.match(/MERGEFIELD\s+([\w]+)/);
      if (instrMatch) {
        currentGroup.fieldName = instrMatch[1];
      }

      if (run.text.includes('fldCharType="end"')) {
        if (currentGroup.fieldName) {
          fieldGroups.push(currentGroup);
        }
        currentGroup = null;
      }
    }
  }

  // Replace from end to start to preserve indices
  for (let i = fieldGroups.length - 1; i >= 0; i--) {
    const group = fieldGroups[i];
    const fieldName = group.fieldName;
    const value = fields[fieldName] !== undefined ? fields[fieldName] : '';

    // Get formatting from the instrText run
    const instrRun = group.runs.find(r => r.text.includes('instrText'));
    let rPr = '';
    if (instrRun) {
      const rPrMatch = instrRun.text.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
      if (rPrMatch) {
        rPr = `<w:rPr>${rPrMatch[1]}</w:rPr>`;
      }
    }

    // Escape XML
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const replacement = `<w:r>${rPr}<w:t>${escaped}</w:t></w:r>`;

    // Replace from first run start to last run end
    const start = group.runs[0].start;
    const end = group.runs[group.runs.length - 1].end;
    xml = xml.substring(0, start) + replacement + xml.substring(end);
  }

  return xml;
}

async function generatePostcards(options) {
  // Verify template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  // Read template
  console.log('Reading template...');
  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(templateBuffer);

  // Read and parse CSV
  console.log(`Reading CSV: ${options.csvPath}`);
  const csvContent = fs.readFileSync(options.csvPath, 'utf-8');
  const { data } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

  // Filter by status if specified
  let records = data;
  if (options.statuses) {
    records = data.filter(row => options.statuses.includes(row.status));
    console.log(`Filtered to ${records.length} records (statuses: ${options.statuses.join(', ')})`);
  } else {
    console.log(`Processing all ${records.length} records`);
  }

  // Filter out records with missing addresses
  records = records.filter(row => row.addressstreet && row.addressstreet.trim());
  console.log(`${records.length} records with valid addresses`);

  if (records.length === 0) {
    console.error('No records to process after filtering.');
    process.exit(1);
  }

  // Read document.xml from template
  const docXml = await zip.file('word/document.xml').async('string');

  // Extract body content
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) {
    console.error('Could not find <w:body> in template.');
    process.exit(1);
  }
  const bodyContent = bodyMatch[1];

  // Extract the final sectPr (section properties - page size, margins, etc.)
  const sectPrRegex = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/g;
  let lastSectPr = null;
  let lastSectPrIndex = -1;
  let m;
  while ((m = sectPrRegex.exec(bodyContent)) !== null) {
    lastSectPr = m[0];
    lastSectPrIndex = m.index;
  }

  if (!lastSectPr) {
    console.error('Could not find <w:sectPr> in template.');
    process.exit(1);
  }

  // Page content is everything before the final sectPr
  const pageContent = bodyContent.substring(0, lastSectPrIndex).trim();

  // Build merged document
  console.log('Generating postcards...');
  const pages = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    let page = pageContent;

    // Replace merge fields with actual values
    page = replaceMergeFields(page, {
      'Decision_Maker_Name': options.recipientName,
      'Street_Address': row.addressstreet || '',
      'City': row.city || '',
      'Province': row.addressstate || 'ON',
      'Postal_Code': row.addresszipcode || '',
    });

    pages.push(page);
  }

  // Join pages with section breaks
  // Each page except the last gets a section break paragraph
  let mergedBody = '';
  for (let i = 0; i < pages.length; i++) {
    mergedBody += pages[i];
    if (i < pages.length - 1) {
      // Insert section break as an empty paragraph with sectPr
      mergedBody += `<w:p w14:paraId="SEC${String(i).padStart(5, '0')}" w14:textId="77777777"><w:pPr>${lastSectPr}</w:pPr></w:p>`;
    }
  }

  // Final sectPr at body level (for the last page)
  mergedBody += lastSectPr;

  // Build new document XML
  const newDocXml = docXml.replace(
    /<w:body>[\s\S]*<\/w:body>/,
    `<w:body>${mergedBody}</w:body>`
  );

  // Update document.xml in the ZIP
  zip.file('word/document.xml', newDocXml);

  // Change content type from .dotx (template) to .docx (document)
  const contentTypes = await zip.file('[Content_Types].xml').async('string');
  const newContentTypes = contentTypes.replace(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
  );
  zip.file('[Content_Types].xml', newContentTypes);

  // Save output
  const outputBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(options.outputPath, outputBuffer);

  // Summary
  const statusCounts = {};
  records.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  console.log('\n=== Postcard Generation Complete ===');
  console.log(`Total postcards: ${records.length}`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log(`Recipient name: "${options.recipientName}"`);
  console.log(`Output: ${options.outputPath}`);
  console.log('\nReady to send to printer!');
}

// Run
const options = parseArgs();
generatePostcards(options).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
