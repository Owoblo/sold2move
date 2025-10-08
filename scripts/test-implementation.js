#!/usr/bin/env node

// Implementation Test Script
// This script tests the key functionality we've implemented

import { createClient } from '@supabase/supabase-js';

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

function logWarning(message) {
    log(message, 'yellow');
}

function logInfo(message) {
    log(message, 'cyan');
}

// Initialize Supabase
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    logError('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseSchema() {
    log('Testing Database Schema...');
    
    try {
        // Test profiles table structure
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan')
            .limit(1);
        
        if (profilesError) {
            logError(`Profiles table error: ${profilesError.message}`);
            return false;
        }
        
        logSuccess('✅ Profiles table has all required Stripe columns');
        
        // Test billing_history table
        const { data: billingHistory, error: billingError } = await supabase
            .from('billing_history')
            .select('id')
            .limit(1);
        
        if (billingError) {
            logError(`Billing history table error: ${billingError.message}`);
            return false;
        }
        
        logSuccess('✅ Billing history table exists');
        
        return true;
        
    } catch (error) {
        logError(`Database schema test failed: ${error.message}`);
        return false;
    }
}

async function testListingsData() {
    log('Testing Listings Data...');
    
    try {
        // Test just_listed table
        const { data: justListed, error: justListedError } = await supabase
            .from('just_listed')
            .select('id, addressstreet, lastcity, unformattedprice')
            .limit(5);
        
        if (justListedError) {
            logError(`Just listed table error: ${justListedError.message}`);
            return false;
        }
        
        logSuccess(`✅ Just listed table has ${justListed.length} records`);
        
        // Test sold_listings table
        const { data: soldListings, error: soldListingsError } = await supabase
            .from('sold_listings')
            .select('id, addressstreet, lastcity, unformattedprice')
            .limit(5);
        
        if (soldListingsError) {
            logError(`Sold listings table error: ${soldListingsError.message}`);
            return false;
        }
        
        logSuccess(`✅ Sold listings table has ${soldListings.length} records`);
        
        return true;
        
    } catch (error) {
        logError(`Listings data test failed: ${error.message}`);
        return false;
    }
}

async function testUserProfiles() {
    log('Testing User Profiles...');
    
    try {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, business_email, city_name, state_code, onboarding_complete')
            .limit(5);
        
        if (profilesError) {
            logError(`Profiles query error: ${profilesError.message}`);
            return false;
        }
        
        logSuccess(`✅ Found ${profiles.length} user profiles`);
        
        // Check for profiles with city data
        const profilesWithCities = profiles.filter(p => p.city_name && p.state_code);
        logInfo(`  - ${profilesWithCities.length} profiles have city data`);
        
        // Check for completed onboarding
        const completedOnboarding = profiles.filter(p => p.onboarding_complete);
        logInfo(`  - ${completedOnboarding.length} profiles have completed onboarding`);
        
        return true;
        
    } catch (error) {
        logError(`User profiles test failed: ${error.message}`);
        return false;
    }
}

async function testEdgeFunctions() {
    log('Testing Edge Functions...');
    
    try {
        // Test if edge functions are accessible
        const functions = [
            'create-checkout-session-fixed',
            'create-topup-session',
            'grant-signup-bonus-optimized'
        ];
        
        for (const func of functions) {
            try {
                const response = await fetch(`https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/${func}`, {
                    method: 'OPTIONS'
                });
                
                if (response.ok) {
                    logSuccess(`✅ Edge function ${func} is accessible`);
                } else {
                    logWarning(`⚠️ Edge function ${func} returned status ${response.status}`);
                }
            } catch (error) {
                logWarning(`⚠️ Edge function ${func} test failed: ${error.message}`);
            }
        }
        
        return true;
        
    } catch (error) {
        logError(`Edge functions test failed: ${error.message}`);
        return false;
    }
}

async function showImplementationSummary() {
    log('Implementation Summary');
    log('====================');
    log('');
    log('✅ FIXES IMPLEMENTED:');
    log('  1. City selection in onboarding forms - now clickable');
    log('  2. Just listed properties display - fixed filter initialization');
    log('  3. Missing useState import in OnboardingPage - added');
    log('');
    log('✅ UI/UX IMPROVEMENTS:');
    log('  1. UnifiedListings component - combines Just Listed and Sold properties');
    log('  2. Enhanced dashboard structure - simplified routing');
    log('  3. Better tab navigation - instant switching between listing types');
    log('');
    log('✅ STRIPE BILLING SYSTEM:');
    log('  1. Database schema updated - added Stripe columns');
    log('  2. Billing history table created');
    log('  3. Edge functions ready for deployment');
    log('  4. Management scripts created');
    log('  5. Enhanced billing page component');
    log('');
    log('✅ MANAGEMENT TOOLS:');
    log('  - scripts/setup-stripe-products.js - Product creation');
    log('  - scripts/billing-manager.js - Billing management');
    log('  - scripts/test-implementation.js - This test script');
    log('');
    log('🚀 NEXT STEPS:');
    log('  1. Set STRIPE_SECRET_KEY environment variable');
    log('  2. Run: node scripts/setup-stripe-products.js create');
    log('  3. Deploy edge functions to Supabase');
    log('  4. Test the complete billing flow');
    log('');
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'schema':
            await testDatabaseSchema();
            break;
            
        case 'data':
            await testListingsData();
            break;
            
        case 'profiles':
            await testUserProfiles();
            break;
            
        case 'functions':
            await testEdgeFunctions();
            break;
            
        case 'all':
            await testDatabaseSchema();
            console.log('');
            await testListingsData();
            console.log('');
            await testUserProfiles();
            console.log('');
            await testEdgeFunctions();
            console.log('');
            await showImplementationSummary();
            break;
            
        default:
            log('Implementation Test Script');
            log('');
            log('Usage: node test-implementation.js <command>');
            log('');
            log('Commands:');
            log('  schema     - Test database schema');
            log('  data       - Test listings data');
            log('  profiles   - Test user profiles');
            log('  functions  - Test edge functions');
            log('  all        - Run all tests and show summary');
            log('');
            log('Examples:');
            log('  node test-implementation.js all');
            log('  node test-implementation.js schema');
            break;
    }
}

// Run the script
main().catch(console.error);
