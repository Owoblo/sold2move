#!/usr/bin/env node

// Complete Stripe Setup Script
// This script guides you through the complete Stripe setup process

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

async function checkCurrentSetup() {
    log('🔍 CHECKING CURRENT SETUP...');
    log('============================');
    log('');
    
    // Check Stripe keys
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (publishableKey) {
        logSuccess(`✅ Stripe publishable key: ${publishableKey.substring(0, 20)}...`);
        if (publishableKey.startsWith('pk_live_')) {
            logWarning('⚠️  Using LIVE Stripe keys');
        } else if (publishableKey.startsWith('pk_test_')) {
            logInfo('ℹ️  Using TEST Stripe keys');
        }
    } else {
        logError('❌ Stripe publishable key not found');
    }
    
    if (secretKey) {
        logSuccess(`✅ Stripe secret key: ${secretKey.substring(0, 20)}...`);
    } else {
        logError('❌ Stripe secret key not found');
        log('');
        log('🔑 TO GET YOUR SECRET KEY:');
        log('1. Go to: https://dashboard.stripe.com/apikeys');
        log('2. Copy the "Secret key" (starts with sk_live_)');
        log('3. Set it as: export STRIPE_SECRET_KEY="your_secret_key"');
        log('');
    }
    
    log('');
}

async function checkDatabaseSetup() {
    log('🗄️  CHECKING DATABASE SETUP...');
    log('===============================');
    log('');
    
    try {
        // Check billing columns
        const { data: columns, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'profiles')
            .in('column_name', ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan']);
        
        if (error) {
            logError(`Database check failed: ${error.message}`);
            return false;
        }
        
        const columnNames = columns.map(col => col.column_name);
        const requiredColumns = ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
            logError(`Missing columns: ${missingColumns.join(', ')}`);
            return false;
        }
        
        logSuccess('✅ All billing columns exist in profiles table');
        
        // Check billing_history table
        const { data: billingTable, error: billingError } = await supabase
            .from('billing_history')
            .select('id')
            .limit(1);
        
        if (billingError) {
            logError(`Billing history table missing: ${billingError.message}`);
            return false;
        }
        
        logSuccess('✅ Billing history table exists');
        return true;
        
    } catch (error) {
        logError(`Database check failed: ${error.message}`);
        return false;
    }
}

async function checkEdgeFunctions() {
    log('⚡ CHECKING EDGE FUNCTIONS...');
    log('=============================');
    log('');
    
    const functions = [
        'create-checkout-session-fixed',
        'create-portal-session',
        'create-topup-session',
        'stripe-webhook'
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
                logWarning(`⚠️  Edge function ${func} returned status ${response.status}`);
                allFunctionsExist = false;
            }
        } catch (error) {
            logWarning(`⚠️  Edge function ${func} test failed: ${error.message}`);
            allFunctionsExist = false;
        }
    }
    
    return allFunctionsExist;
}

async function showNextSteps() {
    log('🚀 NEXT STEPS TO COMPLETE SETUP:');
    log('=================================');
    log('');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
        log('1. 🔑 GET YOUR STRIPE SECRET KEY:');
        log('   - Go to: https://dashboard.stripe.com/apikeys');
        log('   - Copy the "Secret key" (starts with sk_live_)');
        log('   - Set it as: export STRIPE_SECRET_KEY="your_secret_key"');
        log('');
    }
    
    log('2. 📦 CREATE STRIPE PRODUCTS:');
    log('   - Run: node scripts/setup-live-stripe.js create');
    log('   - This will create subscription plans and credit packages');
    log('   - Copy the generated price IDs to your components');
    log('');
    
    log('3. 🚀 DEPLOY EDGE FUNCTIONS:');
    log('   - Run: supabase functions deploy create-checkout-session-fixed');
    log('   - Run: supabase functions deploy create-portal-session');
    log('   - Run: supabase functions deploy stripe-webhook');
    log('');
    
    log('4. 🔗 SET UP WEBHOOKS:');
    log('   - Go to: https://dashboard.stripe.com/webhooks');
    log('   - Create endpoint: https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/stripe-webhook');
    log('   - Select events: customer.subscription.*, checkout.session.completed');
    log('   - Copy the webhook secret and set: export STRIPE_WEBHOOK_SECRET="wh_..."');
    log('');
    
    log('5. 🧪 TEST THE SYSTEM:');
    log('   - Go to: http://localhost:5173/test-billing');
    log('   - Test subscription upgrades');
    log('   - Test credit purchases');
    log('   - Test customer portal');
    log('');
    
    log('6. 🎯 UPDATE PRICE IDs:');
    log('   - After creating products, update BillingEnhanced.jsx with real price IDs');
    log('   - Replace placeholder price IDs with actual Stripe price IDs');
    log('');
}

async function showCurrentStatus() {
    log('📊 CURRENT SETUP STATUS:');
    log('========================');
    log('');
    
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    log('Stripe Configuration:');
    log(`  Publishable Key: ${publishableKey ? '✅ Set' : '❌ Missing'}`);
    log(`  Secret Key: ${secretKey ? '✅ Set' : '❌ Missing'}`);
    log('');
    
    const dbReady = await checkDatabaseSetup();
    log(`Database Setup: ${dbReady ? '✅ Ready' : '❌ Issues'}`);
    log('');
    
    const functionsReady = await checkEdgeFunctions();
    log(`Edge Functions: ${functionsReady ? '✅ Ready' : '❌ Issues'}`);
    log('');
    
    const overallStatus = publishableKey && secretKey && dbReady && functionsReady;
    log(`Overall Status: ${overallStatus ? '✅ Ready for Production' : '⚠️  Setup Incomplete'}`);
    log('');
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'check':
            await checkCurrentSetup();
            console.log('');
            await checkDatabaseSetup();
            console.log('');
            await checkEdgeFunctions();
            console.log('');
            await showCurrentStatus();
            break;
            
        case 'status':
            await showCurrentStatus();
            break;
            
        case 'next':
            await showNextSteps();
            break;
            
        case 'all':
            await checkCurrentSetup();
            console.log('');
            await checkDatabaseSetup();
            console.log('');
            await checkEdgeFunctions();
            console.log('');
            await showCurrentStatus();
            console.log('');
            await showNextSteps();
            break;
            
        default:
            log('Complete Stripe Setup Script');
            log('');
            log('Usage: node scripts/complete-stripe-setup.js <command>');
            log('');
            log('Commands:');
            log('  check   - Check current setup status');
            log('  status  - Show overall status');
            log('  next    - Show next steps');
            log('  all     - Run all checks and show next steps');
            log('');
            log('Examples:');
            log('  node scripts/complete-stripe-setup.js all');
            log('  node scripts/complete-stripe-setup.js check');
            log('  node scripts/complete-stripe-setup.js next');
            break;
    }
}

// Run the script
main().catch(console.error);
