#!/usr/bin/env node
/**
 * Email postcard pipeline results via Resend
 *
 * Sends the generated CSV and PDF as attachments.
 *
 * Usage:
 *   node scripts/postcard-email-results.cjs <csv-path> <pdf-path>
 *
 * Requires RESEND_API_KEY in environment.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const RECIPIENTS = [
  'business@starmovers.ca',
  'printinkshop@gmail.com',
];
const FROM = process.env.POSTCARD_EMAIL_FROM || 'Saturn Star Services <postcards@sold2move.com>';
const REPLY_TO = 'business@starmovers.ca';

function sendEmail(subject, html, attachments) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      reject(new Error('RESEND_API_KEY not set'));
      return;
    }

    const body = JSON.stringify({
      from: FROM,
      to: RECIPIENTS,
      reply_to: REPLY_TO,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      attachments,
    });

    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Resend API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args[0];
  const pdfPath = args[1];

  if (!csvPath || !pdfPath) {
    // Auto-detect from today's date
    console.error('Usage: node scripts/postcard-email-results.cjs <csv-path> <pdf-path>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath).toString('base64');
  const pdfContent = fs.readFileSync(pdfPath).toString('base64');
  const csvName = path.basename(csvPath);
  const pdfName = path.basename(pdfPath);

  // Count records from CSV
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const recordCount = csvText.trim().split('\n').length - 1; // minus header

  const today = new Date().toISOString().split('T')[0];

  // Read pipeline data for breakdown stats
  const pipelineDir = path.join(__dirname, '.pipeline');
  let step1Count = 0, withPhotos = 0, furnished = 0, unfurnished = 0, unknown = 0;
  let verified = 0, badAddress = 0;
  let cityCounts = {}, statusCounts = {};

  try {
    const step1 = JSON.parse(fs.readFileSync(path.join(pipelineDir, 'step1-filtered.json'), 'utf-8'));
    step1Count = step1.length;
    step1.forEach(l => {
      const city = l.city || l.addresscity || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      const st = l.status || 'unknown';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });
  } catch (e) {}

  try {
    const step4 = JSON.parse(fs.readFileSync(path.join(pipelineDir, 'step4-verified.json'), 'utf-8'));
    withPhotos = step4.filter(l => l.carouselphotos && l.carouselphotos.length > 1).length;
    furnished = step4.filter(l => l.is_furnished === true).length;
    unfurnished = step4.filter(l => l.is_furnished === false).length;
    unknown = step4.filter(l => l.is_furnished == null).length;
    verified = step4.filter(l => l._geocode_verified === true).length;
    badAddress = step4.filter(l => l._geocode_verified === false).length;
  } catch (e) {}

  // Build city breakdown rows
  const cityRows = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => `<tr><td style="padding: 4px 8px; border: 1px solid #eee;">${city}</td><td style="padding: 4px 8px; border: 1px solid #eee; text-align: center;">${count}</td></tr>`)
    .join('');

  // Status breakdown
  const soldCount = statusCounts['sold'] || 0;
  const justListedCount = statusCounts['just_listed'] || 0;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #1a1a1a;">Windsor Postcard Pipeline — ${today}</h2>
      <p>Your postcard batch is ready. Here's the breakdown:</p>

      <h3 style="color: #333; margin-bottom: 8px;">Pipeline Summary</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px;">
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;">Total listings found</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${step1Count}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">↳ Sold</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${soldCount}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;">↳ Just Listed</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${justListedCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">With interior photos</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${withPhotos}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;">Furnished</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #16a34a; font-weight: bold;">${furnished}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Unfurnished (removed)</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #dc2626;">${unfurnished}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;">No interior photos (included)</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${unknown}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Address verified</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${verified}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;">Bad address (removed)</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #dc2626;">${badAddress}</td>
        </tr>
        <tr style="background: #e0f2fe;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Final postcards</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 18px;">${recordCount}</td>
        </tr>
      </table>

      <h3 style="color: #333; margin-bottom: 8px;">By City</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">City</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">Listings</th>
        </tr>
        ${cityRows}
      </table>

      <p>Both files attached. The PDF is print-ready at 9.5" × 4.125".</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #888; font-size: 12px;">Automated by Sold2Move Postcard Pipeline</p>
    </div>
  `;

  console.log(`Sending postcard results to ${RECIPIENTS.join(', ')}...`);
  console.log(`  CSV: ${csvName} (${recordCount} records)`);
  console.log(`  PDF: ${pdfName}`);

  const result = await sendEmail(
    `Windsor Postcards Ready - ${today} (${recordCount} listings)`,
    html,
    [
      { filename: csvName, content: csvContent },
      { filename: pdfName, content: pdfContent },
    ]
  );

  console.log(`Email sent successfully! Message ID: ${result.id}`);
}

main().catch(err => {
  console.error('Email failed:', err.message);
  process.exit(1);
});
