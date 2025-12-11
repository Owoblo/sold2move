#!/usr/bin/env node

/**
 * Test to discover actual table structure
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Discovering listings table structure...\n');

async function discoverStructure() {
  try {
    // Fetch one record with all columns using *
    console.log('📊 Fetching sample record with all columns...');
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error:', error.message);
      console.error(error);
      return;
    }

    if (!data) {
      console.log('⚠️  No records found in table');
      return;
    }

    console.log('✅ Sample record fetched successfully\n');
    console.log('📋 Available columns:');
    console.log('═══════════════════════════════════════\n');

    const columns = Object.keys(data);
    columns.forEach((col, i) => {
      const value = data[col];
      const type = typeof value;
      const sample = type === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value).substring(0, 50);
      console.log(`${i + 1}. ${col} (${type})`);
      console.log(`   Sample: ${sample}\n`);
    });

    console.log('═══════════════════════════════════════');
    console.log(`Total columns: ${columns.length}`);
    console.log('═══════════════════════════════════════\n');

    // Check for specific required columns
    const requiredColumns = ['status', 'lastseenat', 'created_at', 'addressstreet', 'lastcity', 'price'];
    console.log('🔍 Checking for required columns:\n');
    requiredColumns.forEach(col => {
      if (columns.includes(col)) {
        console.log(`✅ ${col} - present`);
      } else {
        console.log(`❌ ${col} - MISSING`);
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

discoverStructure().then(() => {
  console.log('\n✅ Structure discovery completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Discovery failed:', error);
  process.exit(1);
});
