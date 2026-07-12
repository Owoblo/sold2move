#!/usr/bin/env node
/**
 * Email postcard pipeline results via Resend
 *
 * Sends the generated CSV and PDF as attachments.
 *
 * Usage (standalone):
 *   node scripts/postcard-email-results.cjs <csv-path> <pdf-path> [--region windsor|wkg|london]
 *
 * Or import and call:
 *   const { sendPostcardEmail } = require('./postcard-email-results.cjs');
 *   await sendPostcardEmail('wkg', csvPath, pdfPath);
 *
 * Requires RESEND_API_KEY in environment.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getRegionConfig } = require('./postcard-lib.cjs');

const OWNER_EMAIL = 'business@starmovers.ca';
const SOLD_REPORT_EMAIL = 'business@starmovers.ca';
const PRINT_EMAIL  = 'loonieprints@gmail.com';
const FROM = process.env.POSTCARD_EMAIL_FROM || 'Saturn Star Services <postcards@sold2move.com>';
const REPLY_TO = 'business@starmovers.ca';

function sendEmail(to, subject, html, attachments) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      reject(new Error('RESEND_API_KEY not set'));
      return;
    }

    const body = JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
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

function renderHealthSummaryRows(health) {
  if (!health) return '';

  const finalByStatus = health.final_by_status || {};
  const freshnessByAction = health.freshness?.audit_by_action || {};
  const reappeared = health.reappeared_after_sold_archive || {};
  const soldVerification = health.sold_verification || {};
  const addressGuard = health.address_duplicate_guard || {};
  const detailCost = health.detail_cost_control || {};

  const rows = [
    ['Final postcards', health.final_count ?? 0],
    ['Final just-listed', finalByStatus.just_listed || 0],
    ['Final sold', finalByStatus.sold || 0],
    ['Detail freshness reused from cache', detailCost.cached_detail_freshness || 0],
    ['Detail freshness scraped this run', detailCost.detail_freshness_updated || 0],
    ['Detail actor runs', detailCost.detail_actor_runs || 0],
    ['Freshness audit 5-30 days', freshnessByAction.sent_review_5_30_days || 0],
    ['Freshness blocked >30 days', freshnessByAction.blocked_over_30_days || 0],
    ['Reappeared relists checked', reappeared.candidates || 0],
    ['Reappeared relists sent', reappeared.sent || 0],
    ['Reappeared relists blocked/filtered', reappeared.blocked_or_filtered || 0],
    ['Address duplicate guard blocks', addressGuard.rejected_count || 0],
    ['Sold candidates checked', soldVerification.candidates_before_verification || 0],
    ['Sold pulled back active', soldVerification.pulled_back_count || 0],
  ];

  return `
      <h3 style="color: #333; margin-bottom: 8px;">Health Checks</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px;">
        ${rows.map(([label, value], idx) => `
        <tr style="${idx % 2 === 0 ? 'background: #f5f5f5;' : ''}">
          <td style="padding: 8px; border: 1px solid #ddd;">${label}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${value}</td>
        </tr>`).join('')}
      </table>
  `;
}

async function sendSoldOnlyEmail(region, regionLabel, soldListings, today) {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
  const Papa = require('papaparse');

  if (soldListings.length === 0) {
    console.log('  No final sold listings — skipping sold-ready report email.');
    return;
  }

  // Generate sold-only CSV in memory
  const csvData = soldListings.map(l => ({
    Address: l.address || `${l.addressstreet}, ${l.city || l.addresscity}, ${l.addressstate || 'ON'} ${l.addresszipcode || ''}`.trim(),
    Street: l.addressstreet || '',
    City: l.city || l.addresscity || '',
    Province: l.addressstate || 'ON',
    Postal: l.addresszipcode || '',
    Price: l.price || '',
    Status: l.status || '',
    Beds: l.beds || '',
    Baths: l.baths || '',
    Area: l.area || '',
    ListingURL: l.detailurl || '',
    LastSeen: l.lastseenat || '',
  }));
  const csvText = Papa.unparse(csvData);
  const csvContent = Buffer.from(csvText).toString('base64');
  const csvName = `${region}_SoldReady_${today}.csv`;

  // Generate sold-only PDF in memory
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const PAGE_WIDTH = 9.5 * 72;
  const PAGE_HEIGHT = 4.125 * 72;
  const MARGIN = 0.5 * 72;

  for (const listing of soldListings) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const addressStreet = listing.addressstreet || '';
    const city = listing.city || listing.addresscity || '';
    const province = listing.addressstate || 'ON';
    const postal = listing.addresszipcode || '';
    const price = listing.price || '';

    // Header
    page.drawText('SOLD', { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 14, size: 14, font: boldFont, color: rgb(0.8, 0.1, 0.1) });
    page.drawText(addressStreet, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 32, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`${city}, ${province} ${postal}`, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 46, size: 10, font: regularFont, color: rgb(0.3, 0.3, 0.3) });
    if (price) page.drawText(price, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 62, size: 10, font: regularFont, color: rgb(0.3, 0.3, 0.3) });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfContent = Buffer.from(pdfBytes).toString('base64');
  const pdfName = `${region}_SoldReady_${today}.pdf`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #1a1a1a;">Sold-Ready Delivery List — ${regionLabel} — ${today}</h2>
      <p>Here are the <strong>${soldListings.length} final sold listing${soldListings.length !== 1 ? 's' : ''}</strong> from this pipeline run for ${regionLabel}.</p>
      <p>These rows survived the postcard filters and sold verification step. Internal delivery use only — not sent to the print shop.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Address</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">City</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Price</th>
        </tr>
        ${soldListings.map(l => `
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #eee;">${l.addressstreet || ''}</td>
          <td style="padding: 5px 8px; border: 1px solid #eee;">${l.city || l.addresscity || ''}</td>
          <td style="padding: 5px 8px; border: 1px solid #eee;">${l.price || ''}</td>
        </tr>`).join('')}
      </table>
      <p>Both the CSV and PDF are attached for your records.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #888; font-size: 12px;">Automated by Sold2Move Postcard Pipeline — ${regionLabel}</p>
    </div>
  `;

  console.log(`  Sending sold-ready delivery report (${soldListings.length} listings) to ${SOLD_REPORT_EMAIL}...`);
  const result = await sendEmail(
    SOLD_REPORT_EMAIL,
    `Sold-Ready Delivery List — ${regionLabel} — ${today} (${soldListings.length})`,
    html,
    [
      { filename: csvName, content: csvContent },
      { filename: pdfName, content: pdfContent },
    ]
  );
  console.log(`  Sold-ready delivery report sent! ID: ${result.id}`);
}

async function sendFreshnessAuditEmail(region, regionLabel, auditRows, today) {
  const Papa = require('papaparse');
  if (!Array.isArray(auditRows) || auditRows.length === 0) {
    console.log('  No just-listed freshness audit rows — skipping freshness audit email.');
    return;
  }

  const sentReview = auditRows.filter(l => l._freshness_action === 'sent_review_5_30_days');
  const blocked = auditRows.filter(l => l._freshness_action === 'blocked_over_30_days');
  const csvData = auditRows.map(l => ({
    Action: l._freshness_action || '',
    Address: l.address || `${l.addressstreet || ''}, ${l.city || l.addresscity || ''}, ${l.addressstate || 'ON'} ${l.addresszipcode || ''}`.trim(),
    Street: l.addressstreet || '',
    City: l.city || l.addresscity || '',
    Price: l.price || '',
    DetailDaysOnZillow: l._freshness_days ?? l.detail_days_on_zillow ?? '',
    DetailTimeOnZillow: l.detail_time_on_zillow || '',
    DatePosted: l.zillow_date_posted || '',
    ListingURL: l.detailurl || '',
    ZPID: l.zpid || '',
  }));
  const csvText = Papa.unparse(csvData);
  const csvContent = Buffer.from(csvText).toString('base64');
  const csvName = `${region}_FreshnessAudit_${today}.csv`;

  const rowsHtml = auditRows.map(l => {
    const action = l._freshness_action === 'blocked_over_30_days' ? 'Blocked' : 'Sent + review';
    const days = l._freshness_days ?? l.detail_days_on_zillow ?? '';
    const url = l.detailurl ? `<a href="${l.detailurl}">Zillow</a>` : '';
    return `
      <tr>
        <td style="padding: 5px 8px; border: 1px solid #eee;">${l.addressstreet || ''}</td>
        <td style="padding: 5px 8px; border: 1px solid #eee;">${l.city || l.addresscity || ''}</td>
        <td style="padding: 5px 8px; border: 1px solid #eee; text-align: center;">${days}</td>
        <td style="padding: 5px 8px; border: 1px solid #eee;">${action}</td>
        <td style="padding: 5px 8px; border: 1px solid #eee;">${url}</td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px;">
      <h2 style="color: #1a1a1a;">Just-Listed Freshness Audit — ${regionLabel} — ${today}</h2>
      <p>This is the owner-only review list from Zillow detail-page freshness.</p>
      <p><strong>${sentReview.length}</strong> listing${sentReview.length !== 1 ? 's' : ''} were still sent but are 5-30 days on Zillow. <strong>${blocked.length}</strong> listing${blocked.length !== 1 ? 's' : ''} were blocked because they are over 30 days.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Address</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">City</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">Days</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Action</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Link</th>
        </tr>
        ${rowsHtml}
      </table>
      <p>The CSV is attached so you can cross-check these over the next few runs.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #888; font-size: 12px;">Automated by Sold2Move Postcard Pipeline — ${regionLabel}</p>
    </div>
  `;

  console.log(`  Sending freshness audit (${auditRows.length} rows) to ${OWNER_EMAIL}...`);
  const result = await sendEmail(
    OWNER_EMAIL,
    `Just-Listed Freshness Audit — ${regionLabel} — ${today} (${auditRows.length})`,
    html,
    [{ filename: csvName, content: csvContent }]
  );
  console.log(`  Freshness audit sent! ID: ${result.id}`);
}

async function sendFreshnessAuditFromPipeline(region) {
  region = (region || 'windsor').toLowerCase();
  const regionConfig = getRegionConfig(region);
  const regionLabel = regionConfig.label;
  const pipelineDir = path.join(__dirname, `.pipeline-${region}`);
  const auditPath = path.join(pipelineDir, 'step5-freshness-audit.json');
  const today = new Date().toISOString().split('T')[0];

  if (!fs.existsSync(auditPath)) {
    console.log(`  Freshness audit not found for ${region}: ${auditPath}`);
    return null;
  }

  const auditRows = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
  await sendFreshnessAuditEmail(region, regionLabel, auditRows, today);
  return auditRows;
}

async function sendPostcardEmail(region, csvPath, pdfPath) {
  region = (region || 'windsor').toLowerCase();
  const regionConfig = getRegionConfig(region);
  const regionLabel = regionConfig.label;
  const pipelineDir = path.join(__dirname, `.pipeline-${region}`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
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
  let step1Count = 0, withPhotos = 0, furnished = 0, unfurnished = 0, unknown = 0;
  let verified = 0, badAddress = 0;
  let cityCounts = {}, statusCounts = {};
  let healthSummary = null;

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

  try {
    const healthPath = path.join(pipelineDir, 'step5-health-summary.json');
    if (fs.existsSync(healthPath)) {
      healthSummary = JSON.parse(fs.readFileSync(healthPath, 'utf-8'));
    }
  } catch (e) {
    console.warn(`  Health summary skipped: ${e.message}`);
  }

  // Build city breakdown rows
  const cityRows = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => `<tr><td style="padding: 4px 8px; border: 1px solid #eee;">${city}</td><td style="padding: 4px 8px; border: 1px solid #eee; text-align: center;">${count}</td></tr>`)
    .join('');

  const soldCount = statusCounts['sold'] || 0;
  const justListedCount = statusCounts['just_listed'] || 0;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #1a1a1a;">${regionLabel} Postcard Pipeline — ${today}</h2>
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

      ${renderHealthSummaryRows(healthSummary)}

      ${cityRows ? `
      <h3 style="color: #333; margin-bottom: 8px;">By City</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">City</th>
          <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">Listings</th>
        </tr>
        ${cityRows}
      </table>
      ` : ''}

      <p>Both files attached. The PDF is print-ready at 9.5" × 4.125".</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #888; font-size: 12px;">Automated by Sold2Move Postcard Pipeline — ${regionLabel}</p>
    </div>
  `;

  const attachments = [
    { filename: csvName, content: csvContent },
    { filename: pdfName, content: pdfContent },
  ];
  const subject = `${regionLabel} Postcards Ready — ${today} (${recordCount} listings)`;

  // --- Owner email: full breakdown ---
  console.log(`Sending full report to ${OWNER_EMAIL}...`);
  const ownerResult = await sendEmail(OWNER_EMAIL, subject, html, attachments);
  console.log(`  Owner email sent! ID: ${ownerResult.id}`);

  // --- Print shop email: simple instruction, PDF only ---
  const printHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 500px;">
      <p>Hi,</p>
      <p>Please print the attached PDF for the <strong>${regionLabel}</strong> batch — <strong>${recordCount} postcards</strong>, dated ${today}.</p>
      <p>The PDF is print-ready at 9.5" × 4.125".</p>
      <p>Thanks!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #aaa; font-size: 11px;">Saturn Star Services — Sold2Move Postcard Pipeline</p>
    </div>
  `;
  console.log(`Sending print instruction to ${PRINT_EMAIL}...`);
  const printResult = await sendEmail(PRINT_EMAIL, `Print Request: ${regionLabel} Postcards — ${today} (${recordCount})`, printHtml, [
    { filename: pdfName, content: pdfContent },
  ]);
  console.log(`  Print shop email sent! ID: ${printResult.id}`);

  // --- Sold-ready report: final sold rows only, separate owner/internal email ---
  try {
    const finalPath = path.join(pipelineDir, 'step5-final.json');
    if (!fs.existsSync(finalPath)) {
      console.warn('  Sold-ready report skipped: step5-final.json not found');
    } else {
      const finalListings = JSON.parse(fs.readFileSync(finalPath, 'utf-8'));
      const soldListings = finalListings.filter(l => l.status === 'sold');
      await sendSoldOnlyEmail(region, regionLabel, soldListings, today);
    }
  } catch (e) {
    console.warn(`  Sold-ready report skipped: ${e.message}`);
  }

  // --- Just-listed freshness audit: sent 5-30 day rows and blocked >30 day rows ---
  try {
    const auditPath = path.join(pipelineDir, 'step5-freshness-audit.json');
    if (!fs.existsSync(auditPath)) {
      console.warn('  Freshness audit skipped: step5-freshness-audit.json not found');
    } else {
      const auditRows = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
      await sendFreshnessAuditEmail(region, regionLabel, auditRows, today);
    }
  } catch (e) {
    console.warn(`  Freshness audit skipped: ${e.message}`);
  }

  return ownerResult;
}

// Standalone usage
if (require.main === module) {
  const args = process.argv.slice(2);
  let csvPath = null;
  let pdfPath = null;
  let region = 'windsor';
  let freshnessAuditOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--region') {
      region = args[++i];
    } else if (args[i] === '--freshness-audit-only') {
      freshnessAuditOnly = true;
    } else if (!csvPath) {
      csvPath = args[i];
    } else if (!pdfPath) {
      pdfPath = args[i];
    }
  }

  if (freshnessAuditOnly) {
    sendFreshnessAuditFromPipeline(region).catch(err => {
      console.error('Freshness audit email failed:', err.message);
      process.exit(1);
    });
    return;
  }

  if (!csvPath || !pdfPath) {
    console.error('Usage: node scripts/postcard-email-results.cjs <csv-path> <pdf-path> [--region windsor|wkg|london]');
    console.error('   or: node scripts/postcard-email-results.cjs --region ottawa --freshness-audit-only');
    process.exit(1);
  }

  sendPostcardEmail(region, csvPath, pdfPath).catch(err => {
    console.error('Email failed:', err.message);
    process.exit(1);
  });
}

module.exports = { sendPostcardEmail, sendFreshnessAuditFromPipeline };
