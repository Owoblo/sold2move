#!/usr/bin/env node

// Debug Navigation Issue
// This script helps debug why search results are not navigating to property detail pages

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://idbyrtwdeeruiutoukct.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko'
);

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'blue') {
    console.log(`${colors[color]}[${color.toUpperCase()}]${colors.reset} ${message}`);
}

function logSuccess(message) {
    log(message, 'green');
}

function logError(message) {
    log(message, 'red');
}

function logInfo(message) {
    log(message, 'cyan');
}

function logWarning(message) {
    log(message, 'yellow');
}

// Debug search results and navigation URLs
async function debugNavigation() {
    try {
        log('🔍 Debugging search navigation issue...');
        
        // Test search for "Ouel" (similar to what user is searching)
        const searchTerm = 'Ouel';
        logInfo(`\nTesting search for: "${searchTerm}"`);
        
        // Search in just_listed
        const { data: justListedResults, error: justListedError } = await supabase
            .from('just_listed')
            .select('id, addressstreet, lastcity, addressstate, addresszipcode')
            .ilike('addressstreet', `%${searchTerm}%`)
            .limit(5);

        if (justListedError) {
            logError(`Error searching just_listed: ${justListedError.message}`);
        } else {
            logInfo(`\n📋 Just Listed Results (${justListedResults?.length || 0} found):`);
            justListedResults?.forEach((result, index) => {
                const navUrl = `/dashboard/listings/property/${result.id}`;
                logInfo(`${index + 1}. ${result.addressstreet}, ${result.lastcity}, ${result.addressstate} ${result.addresszipcode}`);
                logInfo(`   Property ID: ${result.id} (Type: ${typeof result.id})`);
                logInfo(`   Navigation URL: ${navUrl}`);
                logInfo(`   Full URL: https://sold2move.com${navUrl}`);
            });
        }

        // Search in sold_listings
        const { data: soldResults, error: soldError } = await supabase
            .from('sold_listings')
            .select('id, addressstreet, lastcity, addressstate, addresszipcode')
            .ilike('addressstreet', `%${searchTerm}%`)
            .limit(5);

        if (soldError) {
            logError(`Error searching sold_listings: ${soldError.message}`);
        } else {
            logInfo(`\n📋 Sold Listings Results (${soldResults?.length || 0} found):`);
            soldResults?.forEach((result, index) => {
                const navUrl = `/dashboard/listings/property/${result.id}`;
                logInfo(`${index + 1}. ${result.addressstreet}, ${result.lastcity}, ${result.addressstate} ${result.addresszipcode}`);
                logInfo(`   Property ID: ${result.id} (Type: ${typeof result.id})`);
                logInfo(`   Navigation URL: ${navUrl}`);
                logInfo(`   Full URL: https://sold2move.com${navUrl}`);
            });
        }

        // Test a specific property ID to see if it exists
        if (justListedResults && justListedResults.length > 0) {
            const testId = justListedResults[0].id;
            logInfo(`\n🔍 Testing property ID ${testId}...`);
            
            const { data: testProperty, error: testError } = await supabase
                .from('just_listed')
                .select('*')
                .eq('id', testId)
                .single();

            if (testError) {
                logError(`Error fetching property ${testId}: ${testError.message}`);
            } else {
                logSuccess(`✅ Property ${testId} exists and is accessible`);
                logInfo(`   Address: ${testProperty.addressstreet}`);
                logInfo(`   City: ${testProperty.lastcity}`);
            }
        }

        logInfo('\n📝 Debug Summary:');
        logInfo('- Check if property IDs are being passed correctly');
        logInfo('- Verify navigation URLs are properly formatted');
        logInfo('- Ensure property detail page route is working');
        logInfo('- Check for any JavaScript errors in browser console');
        logInfo('- Verify React Router navigation is functioning');

        return true;
        
    } catch (error) {
        logError(`❌ Debug failed: ${error.message}`);
        return false;
    }
}

// Main function
async function main() {
    await debugNavigation();
}

// Run the script
main().catch(console.error);
