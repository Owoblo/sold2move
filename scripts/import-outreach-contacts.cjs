#!/usr/bin/env node
/**
 * Import outreach contacts from all_leads CSV file into Supabase.
 * Usage: node scripts/import-outreach-contacts.cjs <csv-file>
 *
 * Filters: only rows with Email Status = "likely" and valid email addresses.
 * Normalizes US state names to abbreviations; Canadian provinces pass through.
 * Upserts to outreach_contacts on conflict by email.
 */

const fs = require('fs');
const { getSupabase } = require('./postcard-lib.cjs');

// US state name → abbreviation map
const US_STATES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

/**
 * Normalize a state/province value to its abbreviation.
 * Canadian provinces (ON, AB, BC, etc.) are already abbreviated — pass through.
 * US full names get mapped to 2-letter codes.
 */
function normalizeState(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a 2-letter abbreviation — return uppercased
  if (trimmed.length <= 3) return trimmed.toUpperCase();

  // Try US state lookup
  const abbr = US_STATES[trimmed.toLowerCase()];
  if (abbr) return abbr;

  // Unknown — return as-is
  return trimmed;
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Validate email format (basic check)
 */
function isValidEmail(str) {
  if (!str) return false;
  // Reject if it looks like a URL or has no @
  if (str.startsWith('http') || !str.includes('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/**
 * Parse CSV and return filtered contact objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { contacts: [], skipped: { pending: 0, badEmail: 0, blank: 0 } };

  const header = parseCSVLine(lines[0]).map(h => h.trim());

  // Build column index map
  const col = {};
  header.forEach((h, i) => { col[h] = i; });

  const contacts = [];
  const skipped = { pending: 0, badEmail: 0, blank: 0 };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { skipped.blank++; continue; }

    const values = parseCSVLine(line);

    const emailStatus = (values[col['Email Status']] || '').trim().toLowerCase();
    if (emailStatus !== 'likely') {
      skipped.pending++;
      continue;
    }

    const email = (values[col['Email']] || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      skipped.badEmail++;
      continue;
    }

    const companyName = (values[col['Company Name']] || '').trim();
    const city = (values[col['City']] || '').trim();
    const state = normalizeState(values[col['State/Province']]);
    const country = (values[col['Country']] || '').trim();
    const website = (values[col['Website']] || '').trim();
    const domain = (values[col['Domain']] || '').trim();
    const tier = (values[col['Tier']] || '').trim();
    const priority = parseInt(values[col['Priority']] || '0', 10) || 0;
    const source = (values[col['Source']] || '').trim();

    contacts.push({
      company_name: companyName,
      email,
      primary_city: city || 'Unknown',
      primary_state: state,
      source: source || 'csv_import',
      status: 'active',
      metadata: {
        tier,
        priority,
        country,
        website: website || undefined,
        domain: domain || undefined,
        original_source: source || undefined,
      },
    });
  }

  return { contacts, skipped };
}

async function main() {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error('Usage: node scripts/import-outreach-contacts.cjs <csv-file>');
    process.exit(1);
  }

  console.log(`Reading contacts from: ${csvFile}`);
  const csvText = fs.readFileSync(csvFile, 'utf-8');

  const { contacts: rawContacts, skipped } = parseCSV(csvText);

  // Deduplicate by email (keep first occurrence — higher priority rows come first in CSV)
  const seen = new Set();
  const contacts = rawContacts.filter(c => {
    if (seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });
  const dupes = rawContacts.length - contacts.length;

  console.log(`\n--- FILTERING ---`);
  console.log(`Valid contacts (email_status=likely): ${rawContacts.length}`);
  console.log(`Duplicates removed: ${dupes}`);
  console.log(`Unique contacts to import: ${contacts.length}`);
  console.log(`Skipped (pending/other status): ${skipped.pending}`);
  console.log(`Skipped (bad/missing email): ${skipped.badEmail}`);
  console.log(`Skipped (blank lines): ${skipped.blank}`);

  if (contacts.length === 0) {
    console.log('No valid contacts to import.');
    return;
  }

  // Show state normalization summary
  const states = {};
  contacts.forEach(c => {
    const s = c.primary_state || 'NULL';
    states[s] = (states[s] || 0) + 1;
  });
  console.log(`\n--- STATE DISTRIBUTION ---`);
  Object.entries(states).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    console.log(`  ${s}: ${n}`);
  });

  // Upsert to Supabase in batches
  const supabase = getSupabase();
  const BATCH_SIZE = 50;
  let upserted = 0;
  let errors = 0;

  console.log(`\n--- UPSERTING TO SUPABASE ---`);
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('outreach_contacts')
      .upsert(batch, { onConflict: 'email' })
      .select('id');

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      upserted += data.length;
      process.stdout.write(`  Upserted ${upserted}/${contacts.length}\r`);
    }
  }

  console.log(`\n\n--- RESULT ---`);
  console.log(`Successfully upserted: ${upserted}`);
  if (errors > 0) console.log(`Errors: ${errors}`);

  // Verify total count
  const { count } = await supabase
    .from('outreach_contacts')
    .select('*', { count: 'exact', head: true });

  console.log(`Total contacts in outreach_contacts: ${count}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
