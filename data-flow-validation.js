// Data Flow Validation Script for Sold2Move
// This script validates the entire data pipeline from scraper to frontend

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validate database schema and column consistency
 */
async function validateDatabaseSchema() {
  console.log('🔍 Validating database schema...');
  
  const tables = ['current_listings', 'previous_listings', 'just_listed', 'sold_listings', 'runs', 'listing_reveals'];
  const requiredColumns = {
    current_listings: ['id', 'zpid', 'addressstreet', 'addresscity', 'addressstate', 'unformattedprice', 'beds', 'baths', 'area', 'statustext', 'lastseenat'],
    previous_listings: ['id', 'zpid', 'addressstreet', 'addresscity', 'addressstate', 'unformattedprice', 'beds', 'baths', 'area', 'statustext', 'lastseenat'],
    just_listed: ['id', 'zpid', 'addressstreet', 'addresscity', 'addressstate', 'unformattedprice', 'beds', 'baths', 'area', 'statustext', 'lastseenat'],
    sold_listings: ['id', 'zpid', 'addressstreet', 'addresscity', 'addressstate', 'unformattedprice', 'beds', 'baths', 'area', 'statustext', 'lastseenat'],
    runs: ['id', 'started_at', 'ended_at'],
    listing_reveals: ['id', 'user_id', 'listing_id', 'created_at']
  };

  const results = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        results[table] = { status: 'error', message: error.message };
        continue;
      }

      const sampleRecord = data?.[0];
      const missingColumns = [];
      const extraColumns = [];

      // Check for required columns
      for (const column of requiredColumns[table] || []) {
        if (!(column in (sampleRecord || {}))) {
          missingColumns.push(column);
        }
      }

      // Check for unexpected columns (basic check)
      if (sampleRecord) {
        const recordColumns = Object.keys(sampleRecord);
        const expectedColumns = requiredColumns[table] || [];
        for (const column of recordColumns) {
          if (!expectedColumns.includes(column) && !['created_at', 'updated_at'].includes(column)) {
            extraColumns.push(column);
          }
        }
      }

      results[table] = {
        status: 'success',
        hasData: !!sampleRecord,
        missingColumns,
        extraColumns,
        sampleRecord: sampleRecord ? Object.keys(sampleRecord) : []
      };

    } catch (err) {
      results[table] = { status: 'error', message: err.message };
    }
  }

  return results;
}

/**
 * Validate data consistency between tables
 */
async function validateDataConsistency() {
  console.log('🔍 Validating data consistency...');
  
  const results = {};

  try {
    // Check if just_listed has data that should be in current_listings
    const { data: justListedData, error: justListedError } = await supabase
      .from('just_listed')
      .select('zpid, lastcity')
      .limit(10);

    if (justListedError) {
      results.justListedCheck = { status: 'error', message: justListedError.message };
    } else {
      results.justListedCheck = {
        status: 'success',
        count: justListedData.length,
        sample: justListedData.slice(0, 3)
      };
    }

    // Check if sold_listings has data
    const { data: soldListingsData, error: soldListingsError } = await supabase
      .from('sold_listings')
      .select('zpid, lastcity')
      .limit(10);

    if (soldListingsError) {
      results.soldListingsCheck = { status: 'error', message: soldListingsError.message };
    } else {
      results.soldListingsCheck = {
        status: 'success',
        count: soldListingsData.length,
        sample: soldListingsData.slice(0, 3)
      };
    }

    // Check runs table
    const { data: runsData, error: runsError } = await supabase
      .from('runs')
      .select('id, started_at, ended_at')
      .order('started_at', { ascending: false })
      .limit(5);

    if (runsError) {
      results.runsCheck = { status: 'error', message: runsError.message };
    } else {
      results.runsCheck = {
        status: 'success',
        count: runsData.length,
        latest: runsData[0],
        sample: runsData.slice(0, 3)
      };
    }

  } catch (err) {
    results.generalError = { status: 'error', message: err.message };
  }

  return results;
}

/**
 * Test frontend query patterns
 */
async function testFrontendQueries() {
  console.log('🔍 Testing frontend query patterns...');
  
  const results = {};

  try {
    // Test just_listed query (similar to useJustListedEnhanced)
    const { data: justListedData, error: justListedError } = await supabase
      .from('just_listed')
      .select('id,zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,lastseenat,created_at', { count: 'exact' })
      .order('lastseenat', { ascending: false })
      .limit(5);

    if (justListedError) {
      results.justListedQuery = { status: 'error', message: justListedError.message };
    } else {
      results.justListedQuery = {
        status: 'success',
        count: justListedData.length,
        sample: justListedData.slice(0, 2)
      };
    }

    // Test sold_listings query (similar to useSoldListingsEnhanced)
    const { data: soldListingsData, error: soldListingsError } = await supabase
      .from('sold_listings')
      .select('id,zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,lastseenat,created_at')
      .limit(5);

    if (soldListingsError) {
      results.soldListingsQuery = { status: 'error', message: soldListingsError.message };
    } else {
      results.soldListingsQuery = {
        status: 'success',
        count: soldListingsData.length,
        sample: soldListingsData.slice(0, 2)
      };
    }

    // Test city filtering
    const { data: cityFilteredData, error: cityFilteredError } = await supabase
      .from('just_listed')
      .select('lastcity, count(*)')
      .group('lastcity')
      .limit(10);

    if (cityFilteredError) {
      results.cityFiltering = { status: 'error', message: cityFilteredError.message };
    } else {
      results.cityFiltering = {
        status: 'success',
        cities: cityFilteredData
      };
    }

  } catch (err) {
    results.generalError = { status: 'error', message: err.message };
  }

  return results;
}

/**
 * Validate data types and formats
 */
async function validateDataTypes() {
  console.log('🔍 Validating data types and formats...');
  
  const results = {};

  try {
    // Check just_listed data types
    const { data: justListedData, error: justListedError } = await supabase
      .from('just_listed')
      .select('unformattedprice, beds, baths, area, lastseenat')
      .limit(10);

    if (justListedError) {
      results.justListedTypes = { status: 'error', message: justListedError.message };
    } else {
      const typeIssues = [];
      
      for (const record of justListedData) {
        if (record.unformattedprice !== null && typeof record.unformattedprice !== 'number') {
          typeIssues.push(`unformattedprice should be number, got ${typeof record.unformattedprice}`);
        }
        if (record.beds !== null && typeof record.beds !== 'number') {
          typeIssues.push(`beds should be number, got ${typeof record.beds}`);
        }
        if (record.baths !== null && typeof record.baths !== 'number') {
          typeIssues.push(`baths should be number, got ${typeof record.baths}`);
        }
        if (record.area !== null && typeof record.area !== 'number') {
          typeIssues.push(`area should be number, got ${typeof record.area}`);
        }
        if (record.lastseenat && !(record.lastseenat instanceof Date) && typeof record.lastseenat !== 'string') {
          typeIssues.push(`lastseenat should be date string, got ${typeof record.lastseenat}`);
        }
      }

      results.justListedTypes = {
        status: typeIssues.length === 0 ? 'success' : 'warning',
        issues: typeIssues,
        sample: justListedData.slice(0, 2)
      };
    }

  } catch (err) {
    results.generalError = { status: 'error', message: err.message };
  }

  return results;
}

/**
 * Test performance of common queries
 */
async function testQueryPerformance() {
  console.log('🔍 Testing query performance...');
  
  const results = {};

  try {
    // Test just_listed query performance
    const startTime = Date.now();
    const { data: justListedData, error: justListedError } = await supabase
      .from('just_listed')
      .select('*')
      .order('lastseenat', { ascending: false })
      .limit(20);
    const justListedTime = Date.now() - startTime;

    if (justListedError) {
      results.justListedPerformance = { status: 'error', message: justListedError.message };
    } else {
      results.justListedPerformance = {
        status: 'success',
        executionTime: `${justListedTime}ms`,
        recordCount: justListedData.length,
        performance: justListedTime < 1000 ? 'good' : justListedTime < 3000 ? 'acceptable' : 'slow'
      };
    }

    // Test sold_listings query performance
    const startTime2 = Date.now();
    const { data: soldListingsData, error: soldListingsError } = await supabase
      .from('sold_listings')
      .select('*')
      .order('lastseenat', { ascending: false })
      .limit(20);
    const soldListingsTime = Date.now() - startTime2;

    if (soldListingsError) {
      results.soldListingsPerformance = { status: 'error', message: soldListingsError.message };
    } else {
      results.soldListingsPerformance = {
        status: 'success',
        executionTime: `${soldListingsTime}ms`,
        recordCount: soldListingsData.length,
        performance: soldListingsTime < 1000 ? 'good' : soldListingsTime < 3000 ? 'acceptable' : 'slow'
      };
    }

  } catch (err) {
    results.generalError = { status: 'error', message: err.message };
  }

  return results;
}

/**
 * Main validation function
 */
async function validateDataFlow() {
  console.log('🚀 Starting Sold2Move Data Flow Validation...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    schema: await validateDatabaseSchema(),
    consistency: await validateDataConsistency(),
    frontendQueries: await testFrontendQueries(),
    dataTypes: await validateDataTypes(),
    performance: await testQueryPerformance()
  };

  // Print summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('====================');
  
  const schemaIssues = Object.values(results.schema).filter(r => r.status === 'error').length;
  const consistencyIssues = Object.values(results.consistency).filter(r => r.status === 'error').length;
  const queryIssues = Object.values(results.frontendQueries).filter(r => r.status === 'error').length;
  const typeIssues = Object.values(results.dataTypes).filter(r => r.status === 'warning' || r.status === 'error').length;
  const performanceIssues = Object.values(results.performance).filter(r => r.performance === 'slow').length;

  console.log(`✅ Schema validation: ${Object.keys(results.schema).length - schemaIssues}/${Object.keys(results.schema).length} tables OK`);
  console.log(`✅ Data consistency: ${Object.keys(results.consistency).length - consistencyIssues}/${Object.keys(results.consistency).length} checks OK`);
  console.log(`✅ Frontend queries: ${Object.keys(results.frontendQueries).length - queryIssues}/${Object.keys(results.frontendQueries).length} queries OK`);
  console.log(`✅ Data types: ${Object.keys(results.dataTypes).length - typeIssues}/${Object.keys(results.dataTypes).length} checks OK`);
  console.log(`✅ Performance: ${Object.keys(results.performance).length - performanceIssues}/${Object.keys(results.performance).length} queries fast`);

  if (schemaIssues > 0 || consistencyIssues > 0 || queryIssues > 0 || typeIssues > 0 || performanceIssues > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    
    if (schemaIssues > 0) {
      console.log(`   - ${schemaIssues} schema issues`);
    }
    if (consistencyIssues > 0) {
      console.log(`   - ${consistencyIssues} consistency issues`);
    }
    if (queryIssues > 0) {
      console.log(`   - ${queryIssues} query issues`);
    }
    if (typeIssues > 0) {
      console.log(`   - ${typeIssues} data type issues`);
    }
    if (performanceIssues > 0) {
      console.log(`   - ${performanceIssues} performance issues`);
    }
  } else {
    console.log('\n🎉 ALL CHECKS PASSED! Data flow is working correctly.');
  }

  return results;
}

// Export for use in other scripts
export { validateDataFlow, validateDatabaseSchema, validateDataConsistency, testFrontendQueries, validateDataTypes, testQueryPerformance };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateDataFlow().catch(console.error);
}
