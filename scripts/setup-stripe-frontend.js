#!/usr/bin/env node

// Frontend Stripe Setup Script
// This script helps set up the frontend Stripe integration

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

async function checkStripeConfiguration() {
    log('Checking Stripe Configuration...');
    
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
        logError('VITE_STRIPE_PUBLISHABLE_KEY environment variable is required');
        return false;
    }
    
    logSuccess(`✅ Stripe publishable key found: ${publishableKey.substring(0, 20)}...`);
    
    if (publishableKey.startsWith('pk_live_')) {
        logWarning('⚠️ You are using LIVE Stripe keys! Make sure this is intentional.');
    } else if (publishableKey.startsWith('pk_test_')) {
        logInfo('ℹ️ Using Stripe test keys (safe for development)');
    } else {
        logError('❌ Invalid Stripe publishable key format');
        return false;
    }
    
    return true;
}

async function checkDatabaseSchema() {
    log('Checking Database Schema for Billing...');
    
    try {
        // Check if billing columns exist
        const { data: columns, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'profiles')
            .in('column_name', ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan']);
        
        if (error) {
            logError(`Database schema check failed: ${error.message}`);
            return false;
        }
        
        const columnNames = columns.map(col => col.column_name);
        const requiredColumns = ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
            logError(`Missing required columns: ${missingColumns.join(', ')}`);
            return false;
        }
        
        logSuccess('✅ All required billing columns exist in profiles table');
        
        // Check billing_history table
        const { data: billingTable, error: billingError } = await supabase
            .from('billing_history')
            .select('id')
            .limit(1);
        
        if (billingError) {
            logError(`Billing history table check failed: ${billingError.message}`);
            return false;
        }
        
        logSuccess('✅ Billing history table exists');
        
        return true;
        
    } catch (error) {
        logError(`Database schema check failed: ${error.message}`);
        return false;
    }
}

async function checkEdgeFunctions() {
    log('Checking Edge Functions...');
    
    const functions = [
        'create-checkout-session-fixed',
        'create-portal-session',
        'create-topup-session'
    ];
    
    let allFunctionsExist = true;
    
    for (const func of functions) {
        try {
            const response = await fetch(`https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/${func}`, {
                method: 'OPTIONS'
            });
            
            if (response.ok) {
                logSuccess(`✅ Edge function ${func} is accessible`);
            } else {
                logWarning(`⚠️ Edge function ${func} returned status ${response.status}`);
                allFunctionsExist = false;
            }
        } catch (error) {
            logWarning(`⚠️ Edge function ${func} test failed: ${error.message}`);
            allFunctionsExist = false;
        }
    }
    
    return allFunctionsExist;
}

async function showNextSteps() {
    log('Next Steps for Complete Stripe Setup');
    log('=====================================');
    log('');
    log('1. PROVIDE STRIPE SECRET KEY:');
    log('   - Get your Stripe secret key from: https://dashboard.stripe.com/apikeys');
    log('   - Set it as environment variable: STRIPE_SECRET_KEY');
    log('   - Run: node scripts/setup-stripe-products.js create');
    log('');
    log('2. CREATE STRIPE PRODUCTS:');
    log('   - The script will create subscription plans and credit packages');
    log('   - Copy the generated price IDs to BillingEnhanced.jsx');
    log('');
    log('3. DEPLOY EDGE FUNCTIONS:');
    log('   - Deploy create-checkout-session-fixed');
    log('   - Deploy create-portal-session');
    log('   - Deploy create-topup-session');
    log('');
    log('4. SET UP WEBHOOKS:');
    log('   - Create webhook endpoint in Stripe Dashboard');
    log('   - Point to: https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/stripe-webhook');
    log('   - Select events: customer.subscription.*, checkout.session.completed');
    log('');
    log('5. TEST BILLING FLOW:');
    log('   - Go to: http://localhost:5173/dashboard/billing');
    log('   - Test subscription upgrades');
    log('   - Test credit purchases');
    log('   - Test customer portal');
    log('');
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'check':
            await checkStripeConfiguration();
            console.log('');
            await checkDatabaseSchema();
            console.log('');
            await checkEdgeFunctions();
            console.log('');
            await showNextSteps();
            break;
            
        case 'config':
            await checkStripeConfiguration();
            break;
            
        case 'schema':
            await checkDatabaseSchema();
            break;
            
        case 'functions':
            await checkEdgeFunctions();
            break;
            
        default:
            log('Stripe Frontend Setup Script');
            log('');
            log('Usage: node scripts/setup-stripe-frontend.js <command>');
            log('');
            log('Commands:');
            log('  check     - Run all checks and show next steps');
            log('  config    - Check Stripe configuration');
            log('  schema    - Check database schema');
            log('  functions - Check edge functions');
            log('');
            log('Examples:');
            log('  node scripts/setup-stripe-frontend.js check');
            log('  node scripts/setup-stripe-frontend.js config');
            break;
    }
}

// Run the script
main().catch(console.error);
