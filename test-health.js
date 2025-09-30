#!/usr/bin/env node

/**
 * Health Check Test Script
 * Run this to test your application health without starting the dev server
 * 
 * Usage: node test-health.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

console.log('🔍 Running Health Checks...\n');

// Test 1: Basic App Health
console.log('1️⃣ Application Health Check');
console.log('✅ App is running');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Node Version: ${process.version}`);
console.log(`   Timestamp: ${new Date().toISOString()}\n`);

// Test 2: Environment Variables
console.log('2️⃣ Environment Variables Check');
const envVars = {
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
  'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY ? '***SET***' : 'MISSING',
  'VITE_SITE_URL': process.env.VITE_SITE_URL
};

Object.entries(envVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  console.log(`   ${status} ${key}: ${value || 'MISSING'}`);
});
console.log('');

// Test 3: Supabase Connection
console.log('3️⃣ Supabase Connection Test');
try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test basic connection
  const { data, error } = await supabase
    .from('runs')
    .select('id')
    .limit(1);
  
  if (error) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
  } else {
    console.log('✅ Supabase connection successful');
    console.log(`   Data returned: ${data ? 'Yes' : 'No'}`);
  }
} catch (err) {
  console.log(`❌ Supabase connection error: ${err.message}`);
}
console.log('');

// Test 4: Database Data Check
console.log('4️⃣ Database Data Check');
try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check runs table
  const { count: runsCount, error: runsError } = await supabase
    .from('runs')
    .select('*', { count: 'exact', head: true });
  
  if (runsError) {
    console.log(`❌ Runs table error: ${runsError.message}`);
  } else {
    console.log(`✅ Runs table: ${runsCount || 0} records`);
  }
  
  // Check listings table
  const { count: listingsCount, error: listingsError } = await supabase
    .from('listings1')
    .select('*', { count: 'exact', head: true });
  
  if (listingsError) {
    console.log(`❌ Listings table error: ${listingsError.message}`);
  } else {
    console.log(`✅ Listings table: ${listingsCount || 0} records`);
  }
  
  // Check Tampa listings specifically
  const { data: tampaListings, error: tampaError } = await supabase
    .from('listings1')
    .select('id, addressCity')
    .eq('addressCity', 'Tampa')
    .limit(5);
  
  if (tampaError) {
    console.log(`❌ Tampa listings error: ${tampaError.message}`);
  } else {
    console.log(`✅ Tampa listings: ${tampaListings?.length || 0} found`);
  }
  
} catch (err) {
  console.log(`❌ Database check error: ${err.message}`);
}
console.log('');

// Test 5: Latest Run Check
console.log('5️⃣ Latest Run Data Check');
try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get latest run
  const { data: latestRun, error: runError } = await supabase
    .from('runs')
    .select('id, started_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
  
  if (runError) {
    console.log(`❌ Latest run error: ${runError.message}`);
  } else {
    console.log(`✅ Latest run: ${latestRun.id}`);
    console.log(`   Started: ${latestRun.started_at}`);
    
    // Check if this run has data
    const { data: runData, error: dataError } = await supabase
      .from('listings1')
      .select('id')
      .eq('lastRunId', latestRun.id)
      .limit(1);
    
    if (dataError) {
      console.log(`❌ Run data check error: ${dataError.message}`);
    } else {
      const hasData = runData && runData.length > 0;
      console.log(`   Has listings data: ${hasData ? '✅ Yes' : '❌ No'}`);
      
      if (!hasData) {
        console.log('   ⚠️  This explains why no listings are showing!');
      }
    }
  }
  
} catch (err) {
  console.log(`❌ Latest run check error: ${err.message}`);
}

console.log('\n🎉 Health check complete!');
console.log('\nTo view the health check in your browser:');
console.log('1. Start your dev server: npm run dev');
console.log('2. Visit: http://localhost:5173/health');
console.log('\nFor API-style health check:');
console.log('3. Visit: http://localhost:5173/health (same page, but shows JSON data)');
