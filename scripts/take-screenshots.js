import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

// Helper function to wait (replaces deprecated page.waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Pages to capture (public pages first, then we'll handle auth pages)
const PUBLIC_PAGES = [
  { name: '01-homepage', url: 'https://sold2move.com/', waitFor: 2000 },
  { name: '02-login', url: 'https://sold2move.com/login', waitFor: 1500 },
  { name: '03-signup', url: 'https://sold2move.com/signup', waitFor: 1500 },
  { name: '04-pricing', url: 'https://sold2move.com/pricing', waitFor: 1500 },
  { name: '05-how-it-works', url: 'https://sold2move.com/how-it-works', waitFor: 1500 },
  { name: '06-faq', url: 'https://sold2move.com/faq', waitFor: 1500 },
];

// Dashboard pages (require auth)
const DASHBOARD_PAGES = [
  { name: '10-dashboard-home', url: 'https://sold2move.com/dashboard', waitFor: 3000 },
  { name: '11-just-listed', url: 'https://sold2move.com/dashboard/listings/just-listed', waitFor: 3000 },
  { name: '12-sold-listings', url: 'https://sold2move.com/dashboard/listings/sold', waitFor: 3000 },
  { name: '13-active-listings', url: 'https://sold2move.com/dashboard/listings/active', waitFor: 3000 },
  { name: '14-property-detail', url: 'https://sold2move.com/dashboard/listings/property/2060157553', waitFor: 3000 },
  { name: '15-account-hub', url: 'https://sold2move.com/dashboard/account', waitFor: 2000 },
  { name: '16-settings', url: 'https://sold2move.com/dashboard/settings', waitFor: 2000 },
  { name: '17-billing', url: 'https://sold2move.com/dashboard/billing', waitFor: 2000 },
];

async function takeScreenshots() {
  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Show browser so user can enter verification code
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Take public page screenshots
  console.log('\n📸 Capturing public pages...\n');
  for (const pageInfo of PUBLIC_PAGES) {
    try {
      console.log(`  → ${pageInfo.name}: ${pageInfo.url}`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(pageInfo.waitFor);

      const filepath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`    ✅ Saved: ${filepath}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
    }
  }

  // Login for dashboard pages
  console.log('\n🔐 Logging in for dashboard screenshots...\n');
  try {
    await page.goto('https://sold2move.com/login', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Enter credentials
    await page.type('input[type="email"]', 'johnowolabi80@gmail.com');
    await delay(500);

    // Click continue/login button
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Continue') || text.includes('Login') || text.includes('Sign'))) {
        await button.click();
        break;
      }
    }

    // Wait for verification code page or dashboard
    await delay(5000);

    console.log('  ⚠️  Manual step needed: Check your email for verification code');
    console.log('  The script will wait 60 seconds for you to enter the code...\n');

    // Wait for user to manually complete verification
    await delay(60000);

  } catch (error) {
    console.log(`  ❌ Login failed: ${error.message}`);
    console.log('  Attempting to capture dashboard pages anyway (may show login)...\n');
  }

  // Take dashboard page screenshots
  console.log('\n📸 Capturing dashboard pages...\n');
  for (const pageInfo of DASHBOARD_PAGES) {
    try {
      console.log(`  → ${pageInfo.name}: ${pageInfo.url}`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(pageInfo.waitFor);

      const filepath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`    ✅ Saved: ${filepath}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
    }
  }

  // Also capture mobile viewport
  console.log('\n📱 Capturing mobile versions...\n');
  await page.setViewport({ width: 390, height: 844 }); // iPhone 14 Pro

  const MOBILE_PAGES = [
    { name: '20-mobile-homepage', url: 'https://sold2move.com/', waitFor: 2000 },
    { name: '21-mobile-dashboard', url: 'https://sold2move.com/dashboard', waitFor: 3000 },
    { name: '22-mobile-listings', url: 'https://sold2move.com/dashboard/listings/just-listed', waitFor: 3000 },
  ];

  for (const pageInfo of MOBILE_PAGES) {
    try {
      console.log(`  → ${pageInfo.name}: ${pageInfo.url}`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(pageInfo.waitFor);

      const filepath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`    ✅ Saved: ${filepath}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
    }
  }

  await browser.close();

  console.log('\n✨ Done! Screenshots saved to:', SCREENSHOTS_DIR);
  console.log('\nFiles:');
  const files = fs.readdirSync(SCREENSHOTS_DIR);
  files.forEach(f => console.log(`  - ${f}`));
}

takeScreenshots().catch(console.error);
