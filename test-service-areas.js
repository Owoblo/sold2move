// Test script to verify service area functionality
import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'your-anon-key'; // Replace with actual key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServiceAreas() {
  console.log('🧪 Testing Service Area Functionality...\n');

  try {
    // Test 1: Check if service area columns exist in profiles table
    console.log('1️⃣ Testing profiles table structure...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, service_cities, main_service_city, service_area_cluster')
      .limit(1);

    if (profileError) {
      console.log('❌ Profiles table error:', profileError.message);
      if (profileError.message.includes('column "service_cities" does not exist')) {
        console.log('🔧 Service area columns need to be added to the database');
        console.log('   Run the update-service-areas-schema.sql script first');
        return;
      }
    } else {
      console.log('✅ Profiles table structure is correct');
      console.log('   Sample profile data:', profileData[0]);
    }

    // Test 2: Check if just_listed table exists and has address_city column
    console.log('\n2️⃣ Testing just_listed table structure...');
    const { data: justListedData, error: justListedError } = await supabase
      .from('just_listed')
      .select('id, address_city, address_street')
      .limit(1);

    if (justListedError) {
      console.log('❌ Just listed table error:', justListedError.message);
    } else {
      console.log('✅ Just listed table structure is correct');
      console.log('   Sample listing data:', justListedData[0]);
    }

    // Test 3: Check if sold_listings table exists
    console.log('\n3️⃣ Testing sold_listings table structure...');
    const { data: soldData, error: soldError } = await supabase
      .from('sold_listings')
      .select('id, address_city, address_street')
      .limit(1);

    if (soldError) {
      console.log('❌ Sold listings table error:', soldError.message);
    } else {
      console.log('✅ Sold listings table structure is correct');
      console.log('   Sample sold listing data:', soldData[0]);
    }

    // Test 4: Test service area filtering
    console.log('\n4️⃣ Testing service area filtering...');
    const testCities = ['Windsor', 'Toronto', 'Vancouver'];
    
    const { data: filteredData, error: filterError } = await supabase
      .from('just_listed')
      .select('id, address_city, address_street')
      .in('address_city', testCities)
      .limit(5);

    if (filterError) {
      console.log('❌ Service area filtering error:', filterError.message);
    } else {
      console.log('✅ Service area filtering works');
      console.log(`   Found ${filteredData.length} listings in test cities:`, filteredData);
    }

    console.log('\n🎉 Service area functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testServiceAreas();
