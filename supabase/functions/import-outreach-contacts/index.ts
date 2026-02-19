/**
 * Import Outreach Contacts Edge Function
 * Bulk import moving company contacts for outreach campaigns
 *
 * Accepts CSV data in format:
 * Company Name, Primary City/Region Serviced, Contact Email
 *
 * Or JSON array of contacts
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ContactInput {
  company_name: string;
  primary_city: string;
  primary_state?: string;
  email: string;
  source?: string;
  tags?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const contentType = req.headers.get('content-type') || '';
    let contacts: ContactInput[] = [];

    if (contentType.includes('application/json')) {
      // JSON input
      const body = await req.json();
      contacts = Array.isArray(body) ? body : body.contacts || [];
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      // CSV input
      const csvText = await req.text();
      contacts = parseCSV(csvText);
    } else {
      // Try to parse as JSON anyway
      const body = await req.json();
      contacts = Array.isArray(body) ? body : body.contacts || [];
    }

    if (!contacts.length) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No contacts provided',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📥 Importing ${contacts.length} contacts...`);

    // Validate and normalize contacts
    const normalizedContacts = contacts
      .filter(c => c.email && c.company_name && c.primary_city)
      .map(c => normalizeContact(c));

    if (!normalizedContacts.length) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid contacts found. Required fields: company_name, primary_city, email',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert contacts (update on email conflict)
    const results = {
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    for (const contact of normalizedContacts) {
      try {
        const { data, error } = await supabase
          .from('outreach_contacts')
          .upsert(contact, {
            onConflict: 'email',
            ignoreDuplicates: false,
          })
          .select('id')
          .single();

        if (error) {
          results.errors++;
          results.errorDetails.push(`${contact.email}: ${error.message}`);
        } else {
          // Check if this was an insert or update by seeing if created_at == updated_at
          results.inserted++;
        }
      } catch (err) {
        results.errors++;
        results.errorDetails.push(`${contact.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Import complete:`, results);

    return new Response(JSON.stringify({
      success: true,
      message: `Imported ${results.inserted} contacts`,
      ...results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Parse CSV text into contact objects
 */
function parseCSV(csvText: string): ContactInput[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  // Find column indices
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

  const contacts: ContactInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length <= Math.max(companyIdx, cityIdx, emailIdx)) continue;

    const company = values[companyIdx]?.trim();
    const cityRegion = values[cityIdx >= 0 ? cityIdx : 0]?.trim() || '';
    const email = values[emailIdx]?.trim().toLowerCase();

    if (!company || !email) continue;

    // Parse city/state from "City, State" format
    const { city, state } = parseCityState(cityRegion);

    contacts.push({
      company_name: company,
      primary_city: city || 'Unknown',
      primary_state: state,
      email,
      source: 'csv_import',
    });
  }

  return contacts;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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
 * Parse "City, State" or "City/State" format
 */
function parseCityState(input: string): { city: string; state: string | undefined } {
  // Handle formats like "City, State", "City / State", "City (State)"
  const cleanInput = input.replace(/[()]/g, ',');

  // Try comma first
  if (cleanInput.includes(',')) {
    const parts = cleanInput.split(',').map(p => p.trim());
    return {
      city: parts[0],
      state: parts[1] || undefined,
    };
  }

  // Try slash
  if (input.includes('/')) {
    const parts = input.split('/').map(p => p.trim());
    // If second part looks like a state (2-3 chars), use first as city
    if (parts[1] && parts[1].length <= 3) {
      return { city: parts[0], state: parts[1] };
    }
    // Otherwise might be "City1/City2" format, just use first
    return { city: parts[0], state: undefined };
  }

  // No separator, return as-is
  return { city: input, state: undefined };
}

/**
 * Normalize a contact object for database insertion
 */
function normalizeContact(input: ContactInput): Record<string, unknown> {
  return {
    company_name: input.company_name.trim(),
    email: input.email.toLowerCase().trim(),
    primary_city: input.primary_city.trim(),
    primary_state: input.primary_state?.trim() || null,
    source: input.source || 'manual',
    tags: input.tags || [],
    status: 'active',
  };
}
