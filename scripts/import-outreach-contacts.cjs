#!/usr/bin/env node
/**
 * Import outreach contacts from CSV file
 * Usage: node scripts/import-outreach-contacts.js <csv-file>
 *
 * Or call the edge function directly with curl:
 * curl -X POST https://your-project.supabase.co/functions/v1/import-outreach-contacts \
 *   -H "Authorization: Bearer YOUR_ANON_KEY" \
 *   -H "Content-Type: text/csv" \
 *   --data-binary @contacts.csv
 */

const fs = require('fs');
const path = require('path');

// Sample contacts if no file provided
const SAMPLE_CONTACTS = `Company Name,Primary City/Region Serviced,Contact Email
"J&D Moving Company, LLC","Newark, NJ",jdmovingcompanyllc@gmail.com
Brier Moving Company LLC,"Brier, WA",briermoving@gmail.com
Columbia Self Storage,"Columbia, MO",info@columbiaselfstorage.com
Vanguard Moving Services,"Danbury, CT",info@vanguardmoving.com
Martin County Movers,"Stuart, FL",martincountymovers@gmail.com
Stark Moving and Storage Inc.,"Boston, MA",info@starkmovingstorage.com
What's The Move NC,"Raleigh/Charlotte, NC",whatsthemovenc@gmail.com
Two Men and a Truck,"Tuscaloosa, AL",info0111@twomen.com
A & M Friendly Movers,"York, PA",amfriendlymovers@gmail.com
Moyer Move Management,"Gaithersburg, MD",info@moyermovemanagement.com
Noah's Ark Moving & Storage,"Bronx, NY",info@noahsarkinc.com
"Moving On Birmingham, LLC","Birmingham, AL",movingonbham@gmail.com
Desert Moving Co. & Storage,"Indio, CA",info@desertmoving.com
Division 1 Moving & Storage,"Jacksonville, FL",info@division1moving.com
1st Class Moving & Storage,"Orlando, FL / Baltimore, MD",move@1stclassmovinginc.com
A-1 Moving & Storage,"Jupiter, FL",info@a1moving.com
All Star Moving LLC,"Memphis, TN",allstarmoving901@gmail.com
Pink Transfer Moving,"Monrovia, CA",info@pinktransfer.com
Sunrise Moving and Storage,"Atlanta, GA",info@sunrisemoving.com
Amazing Moves Moving,"Denver, CO",info@amazingmoves.com
Mighty Moving & Storage,"Los Angeles, CA",info@mightymoving.com
QuickSwitch Movers,"Clarksville, TN",quickswitchmovers@gmail.com
Yarnall Moving and Storage,"Sarasota, FL",info@yarnall.com
Southern Moving & Storage,"Wilmington, NC",southernmovingnc@gmail.com
Good Stuff Moving,"St. Paul, MN",info@goodstuffmoving.com
United Van Lines,"Fenton, MO (National HQ)",social@unitedvanlines.com
North American Van Lines,"Fort Wayne, IN (National HQ)",custserv@navl.com
Atlanta Moving Packing (AMPM),"Atlanta, GA",ampmmoving@gmail.com
Raleigh Moving Company,"Raleigh, NC",raleighmoving@gmail.com
Sinatra Movers Company,"Philadelphia, PA",sinatramovers@gmail.com
G Metz Moving & Storage,"Cranston, RI",info@gmetzmoving.com
Alexander's Mobility Services,"Tustin, CA",info@alexanders.net
Mayflower Moving,"Fenton, MO (National HQ)",info@mayflower.com
Camelback Moving,"Phoenix, AZ",info@camelbackmoving.com
Strongman Movers LLC,"Dallas, TX",strongmanmoversllc@gmail.com
Sea Cure Moving,"Forked River, NJ",info@seacuremoving.com
Arnoff Moving & Storage,"Poughkeepsie, NY",info@arnoff.com
San Diego Moving Company,"San Diego, CA",info@sandiegomoving.com
Uplift Movers,"Richmond, TX",upliftmovers@gmail.com
Dircks Moving & Logistics,"Phoenix, AZ",info@dircks.com`;

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
 * Parse city/state from various formats
 */
function parseCityState(input) {
  const cleanInput = input.replace(/[()]/g, ',');

  if (cleanInput.includes(',')) {
    const parts = cleanInput.split(',').map(p => p.trim());
    return {
      city: parts[0],
      state: parts[1] || null,
    };
  }

  if (input.includes('/')) {
    const parts = input.split('/').map(p => p.trim());
    if (parts[1] && parts[1].length <= 3) {
      return { city: parts[0], state: parts[1] };
    }
    return { city: parts[0], state: null };
  }

  return { city: input, state: null };
}

/**
 * Parse CSV text into contact objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  const companyIdx = header.findIndex(h =>
    h.includes('company') || h.includes('name') || h === 'business'
  );
  const cityIdx = header.findIndex(h =>
    h.includes('city') || h.includes('region') || h.includes('area') || h.includes('location')
  );
  const emailIdx = header.findIndex(h =>
    h.includes('email') || h.includes('mail')
  );

  if (companyIdx === -1 || emailIdx === -1) {
    console.error('CSV missing required columns. Found:', header);
    return [];
  }

  const contacts = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length <= Math.max(companyIdx, cityIdx, emailIdx)) continue;

    const company = values[companyIdx]?.trim();
    const cityRegion = values[cityIdx >= 0 ? cityIdx : 0]?.trim() || '';
    const email = values[emailIdx]?.trim().toLowerCase();

    if (!company || !email) continue;

    const { city, state } = parseCityState(cityRegion);

    contacts.push({
      company_name: company,
      primary_city: city || 'Unknown',
      primary_state: state,
      email,
      source: 'csv_import',
      status: 'active',
    });
  }

  return contacts;
}

/**
 * Main function
 */
async function main() {
  const csvFile = process.argv[2];
  let csvText;

  if (csvFile) {
    csvText = fs.readFileSync(csvFile, 'utf-8');
    console.log(`Reading contacts from: ${csvFile}`);
  } else {
    csvText = SAMPLE_CONTACTS;
    console.log('Using sample contacts (no file provided)');
  }

  const contacts = parseCSV(csvText);
  console.log(`Parsed ${contacts.length} contacts\n`);

  // Output as JSON for easy copy/paste or piping to curl
  console.log('--- JSON OUTPUT (for API import) ---');
  console.log(JSON.stringify(contacts, null, 2));

  console.log('\n--- SUMMARY ---');
  const cities = [...new Set(contacts.map(c => c.primary_city))];
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`Unique cities: ${cities.length}`);
  console.log(`Cities: ${cities.slice(0, 10).join(', ')}${cities.length > 10 ? '...' : ''}`);

  // Output SQL for direct database insert
  console.log('\n--- SQL INSERT (for direct DB import) ---');
  console.log(`INSERT INTO outreach_contacts (company_name, email, primary_city, primary_state, source, status) VALUES`);
  const values = contacts.map(c =>
    `  ('${c.company_name.replace(/'/g, "''")}', '${c.email}', '${c.primary_city.replace(/'/g, "''")}', ${c.primary_state ? `'${c.primary_state}'` : 'NULL'}, 'csv_import', 'active')`
  );
  console.log(values.join(',\n') + '\nON CONFLICT (email) DO UPDATE SET company_name = EXCLUDED.company_name, primary_city = EXCLUDED.primary_city, primary_state = EXCLUDED.primary_state;');
}

main().catch(console.error);
