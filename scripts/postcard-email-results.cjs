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

const RECIPIENT = process.env.POSTCARD_EMAIL_TO || 'business@starmovers.ca';
const FROM = process.env.POSTCARD_EMAIL_FROM || 'Sold2Move Pipeline <noreply@sold2move.com>';

function sendEmail(subject, html, attachments) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      reject(new Error('RESEND_API_KEY not set'));
      return;
    }

    const body = JSON.stringify({
      from: FROM,
      to: [RECIPIENT],
      subject,
      html,
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #1a1a1a;">Windsor Postcard Pipeline - ${today}</h2>
      <p>Your postcard batch is ready.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Postcards</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${recordCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">CSV File</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${csvName}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">PDF File</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${pdfName}</td>
        </tr>
      </table>
      <p>Both files are attached. The PDF is print-ready at 9.5" x 4.125".</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #888; font-size: 12px;">Automated by Sold2Move Postcard Pipeline</p>
    </div>
  `;

  console.log(`Sending postcard results to ${RECIPIENT}...`);
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
