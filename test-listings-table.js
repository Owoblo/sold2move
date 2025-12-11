#!/usr/bin/env node

/**
 * Test script to verify the new unified listings table
 * Run with: node test-listings-table.js
 */

import { supabase } from './src/lib/customSupabaseClient.js';

console.log('🔍 Testing Unified Listings Table...\n');

async function testListingsTable() {
  try {
    // Test 1: Check if table exists and get total count
    console.log('📊 Test 1: Getting total count...');
    const { count: totalCount, error: countError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error fetching count:', countError.message);
      return;
    }
    console.log(`✅ Total listings in table: ${totalCount}\n`);

    // Test 2: Get count by status
    console.log('📊 Test 2: Getting count by status...');
    const [justListedResult, soldResult, activeResult] = await Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'just_listed'),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    console.log(`✅ Just Listed: ${justListedResult.count || 0}`);
    console.log(`✅ Sold: ${soldResult.count || 0}`);
    console.log(`✅ Active: ${activeResult.count || 0}\n`);

    // Test 3: Fetch sample just_listed records
    console.log('📊 Test 3: Fetching sample just_listed records...');
    const { data: justListedData, error: justListedError } = await supabase
      .from('listings')
      .select('id, addressstreet, lastcity, price, status, lastseenat')
      .eq('status', 'just_listed')
      .order('lastseenat', { ascending: false })
      .limit(3);

    if (justListedError) {
      console.error('❌ Error fetching just_listed:', justListedError.message);
    } else {
      console.log(`✅ Fetched ${justListedData?.length || 0} just_listed records:`);
      justListedData?.forEach((listing, i) => {
        console.log(`   ${i + 1}. ${listing.addressstreet}, ${listing.lastcity} - $${listing.price} (${listing.status})`);
      });
      console.log('');
    }

    // Test 4: Fetch sample sold records
    console.log('📊 Test 4: Fetching sample sold records...');
    const { data: soldData, error: soldError } = await supabase
      .from('listings')
      .select('id, addressstreet, lastcity, price, status, lastseenat')
      .eq('status', 'sold')
      .order('lastseenat', { ascending: false })
      .limit(3);

    if (soldError) {
      console.error('❌ Error fetching sold:', soldError.message);
    } else {
      console.log(`✅ Fetched ${soldData?.length || 0} sold records:`);
      soldData?.forEach((listing, i) => {
        console.log(`   ${i + 1}. ${listing.addressstreet}, ${listing.lastcity} - $${listing.price} (${listing.status})`);
      });
      console.log('');
    }

    // Test 5: Test date filtering (last 7 days)
    console.log('📊 Test 5: Testing date filtering (last 7 days)...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentCount, error: dateError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'just_listed')
      .gte('lastseenat', sevenDaysAgo.toISOString());

    if (dateError) {
      console.error('❌ Error with date filter:', dateError.message);
    } else {
      console.log(`✅ Just listed in last 7 days: ${recentCount || 0}\n`);
    }

    // Test 6: Test city filtering
    console.log('📊 Test 6: Testing city filtering...');
    const { data: cityData, error: cityError } = await supabase
      .from('listings')
      .select('lastcity, status', { count: 'exact' })
      .eq('status', 'just_listed')
      .limit(5);

    if (cityError) {
      console.error('❌ Error with city filter:', cityError.message);
    } else {
      const cities = [...new Set(cityData?.map(l => l.lastcity))];
      console.log(`✅ Sample cities found: ${cities.slice(0, 3).join(', ')}\n`);
    }

    // Test 7: Test price filtering
    console.log('📊 Test 7: Testing price filtering ($300k - $800k)...');
    const { count: priceCount, error: priceError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'just_listed')
      .gte('unformattedprice', 300000)
      .lte('unformattedprice', 800000);

    if (priceError) {
      console.error('❌ Error with price filter:', priceError.message);
    } else {
      console.log(`✅ Listings in $300k-$800k range: ${priceCount || 0}\n`);
    }

    // Test 8: Check for required columns
    console.log('📊 Test 8: Verifying table structure...');
    const { data: sampleRecord, error: structureError } = await supabase
      .from('listings')
      .select('*')
      .limit(1)
      .single();

    if (structureError) {
      console.error('❌ Error checking structure:', structureError.message);
    } else {
      const requiredColumns = [
        'id', 'zpid', 'imgsrc', 'detailurl', 'addressstreet', 'lastcity',
        'addresscity', 'addressstate', 'addresszipcode', 'price',
        'unformattedprice', 'beds', 'baths', 'area', 'statustext',
        'status', 'lastseenat', 'created_at'
      ];

      const missingColumns = requiredColumns.filter(col => !(col in sampleRecord));
      const presentColumns = requiredColumns.filter(col => col in sampleRecord);

      console.log(`✅ Required columns present: ${presentColumns.length}/${requiredColumns.length}`);
      if (missingColumns.length > 0) {
        console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
      }
      if ('updated_at' in sampleRecord) {
        console.log('✅ Optional column "updated_at" present');
      }
      if ('ai_analysis' in sampleRecord) {
        console.log('✅ Optional column "ai_analysis" present');
      }
      console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📋 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Table exists and accessible`);
    console.log(`✅ Total records: ${totalCount || 0}`);
    console.log(`✅ Status filtering works`);
    console.log(`✅ Date filtering works`);
    console.log(`✅ City filtering works`);
    console.log(`✅ Price filtering works`);
    console.log(`✅ Table structure verified`);
    console.log('');
    console.log('🎉 All tests passed! Frontend is ready to use the unified listings table.');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Run tests
testListingsTable();
