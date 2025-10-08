#!/usr/bin/env node

// Billing Management Script
// This script manages Stripe billing, subscriptions, and customer data

import Stripe from 'stripe';
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

// Initialize services
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
    logError('STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
}

if (!supabaseServiceKey) {
    logError('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listCustomers() {
    log('Fetching Stripe customers...');
    
    try {
        const customers = await stripe.customers.list({ limit: 100 });
        
        logInfo(`Found ${customers.data.length} customers`);
        
        for (const customer of customers.data) {
            logInfo(`Customer: ${customer.email} (${customer.id})`);
            if (customer.metadata?.supabase_user_id) {
                logInfo(`  Supabase User ID: ${customer.metadata.supabase_user_id}`);
            }
        }
        
        return customers.data;
    } catch (error) {
        logError(`Failed to fetch customers: ${error.message}`);
        return [];
    }
}

async function listSubscriptions() {
    log('Fetching Stripe subscriptions...');
    
    try {
        const subscriptions = await stripe.subscriptions.list({ 
            limit: 100,
            expand: ['data.customer', 'data.items.data.price.product']
        });
        
        logInfo(`Found ${subscriptions.data.length} subscriptions`);
        
        for (const subscription of subscriptions.data) {
            const customer = subscription.customer;
            const product = subscription.items.data[0]?.price?.product;
            
            logInfo(`Subscription: ${subscription.id}`);
            logInfo(`  Customer: ${customer.email || customer.id}`);
            logInfo(`  Product: ${product?.name || 'Unknown'}`);
            logInfo(`  Status: ${subscription.status}`);
            logInfo(`  Current Period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
            
            if (customer.metadata?.supabase_user_id) {
                logInfo(`  Supabase User ID: ${customer.metadata.supabase_user_id}`);
            }
        }
        
        return subscriptions.data;
    } catch (error) {
        logError(`Failed to fetch subscriptions: ${error.message}`);
        return [];
    }
}

async function syncCustomerData() {
    log('Syncing customer data between Stripe and Supabase...');
    
    try {
        // Get all Stripe customers
        const customers = await stripe.customers.list({ limit: 100 });
        
        // Get all Supabase profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, business_email, stripe_customer_id');
        
        if (profilesError) {
            throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }
        
        logInfo(`Found ${customers.data.length} Stripe customers and ${profiles.length} Supabase profiles`);
        
        let synced = 0;
        let created = 0;
        
        for (const customer of customers.data) {
            const supabaseUserId = customer.metadata?.supabase_user_id;
            
            if (supabaseUserId) {
                // Find matching profile
                const profile = profiles.find(p => p.id === supabaseUserId);
                
                if (profile) {
                    // Update profile with customer ID if not set
                    if (!profile.stripe_customer_id) {
                        const { error: updateError } = await supabase
                            .from('profiles')
                            .update({ stripe_customer_id: customer.id })
                            .eq('id', supabaseUserId);
                        
                        if (updateError) {
                            logError(`Failed to update profile ${supabaseUserId}: ${updateError.message}`);
                        } else {
                            logSuccess(`Synced customer ${customer.id} with profile ${supabaseUserId}`);
                            synced++;
                        }
                    }
                } else {
                    logWarning(`No profile found for Supabase user ${supabaseUserId}`);
                }
            } else {
                logWarning(`Customer ${customer.id} has no Supabase user ID in metadata`);
            }
        }
        
        // Create Stripe customers for profiles without them
        for (const profile of profiles) {
            if (!profile.stripe_customer_id) {
                try {
                    const customer = await stripe.customers.create({
                        email: profile.business_email,
                        metadata: {
                            supabase_user_id: profile.id
                        }
                    });
                    
                    // Update profile with customer ID
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ stripe_customer_id: customer.id })
                        .eq('id', profile.id);
                    
                    if (updateError) {
                        logError(`Failed to update profile ${profile.id}: ${updateError.message}`);
                    } else {
                        logSuccess(`Created Stripe customer ${customer.id} for profile ${profile.id}`);
                        created++;
                    }
                } catch (error) {
                    logError(`Failed to create customer for profile ${profile.id}: ${error.message}`);
                }
            }
        }
        
        logSuccess(`Sync completed: ${synced} synced, ${created} created`);
        
    } catch (error) {
        logError(`Failed to sync customer data: ${error.message}`);
    }
}

async function updateSubscriptionStatus() {
    log('Updating subscription status in Supabase...');
    
    try {
        const subscriptions = await stripe.subscriptions.list({ 
            limit: 100,
            expand: ['data.customer']
        });
        
        let updated = 0;
        
        for (const subscription of subscriptions.data) {
            const customer = subscription.customer;
            const supabaseUserId = customer.metadata?.supabase_user_id;
            
            if (supabaseUserId) {
                // Determine subscription status
                let subscriptionStatus = 'inactive';
                let subscriptionPlan = 'free';
                let creditsRemaining = 100; // Default free credits
                
                if (subscription.status === 'active') {
                    subscriptionStatus = 'active';
                    
                    // Get product details from subscription
                    const product = subscription.items.data[0]?.price?.product;
                    if (product) {
                        subscriptionPlan = product.name.toLowerCase().replace(/\s+/g, '_');
                        const credits = product.metadata?.credits;
                        if (credits && credits !== '-1') {
                            creditsRemaining = parseInt(credits);
                        } else if (credits === '-1') {
                            creditsRemaining = 999999; // Unlimited
                        }
                    }
                }
                
                // Update profile
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        subscription_status: subscriptionStatus,
                        subscription_plan: subscriptionPlan,
                        credits_remaining: creditsRemaining,
                        stripe_subscription_id: subscription.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', supabaseUserId);
                
                if (updateError) {
                    logError(`Failed to update profile ${supabaseUserId}: ${updateError.message}`);
                } else {
                    logSuccess(`Updated profile ${supabaseUserId}: ${subscriptionStatus} (${subscriptionPlan})`);
                    updated++;
                }
            }
        }
        
        logSuccess(`Updated ${updated} profiles with subscription status`);
        
    } catch (error) {
        logError(`Failed to update subscription status: ${error.message}`);
    }
}

async function createTestCustomer() {
    log('Creating test customer...');
    
    try {
        const customer = await stripe.customers.create({
            email: 'test@sold2move.com',
            name: 'Test Customer',
            metadata: {
                supabase_user_id: 'test-user-id',
                test: 'true'
            }
        });
        
        logSuccess(`Created test customer: ${customer.id}`);
        
        // Create a test subscription
        const products = await stripe.products.list({ limit: 10 });
        const starterProduct = products.data.find(p => p.name.includes('Starter'));
        
        if (starterProduct) {
            const prices = await stripe.prices.list({ 
                product: starterProduct.id,
                limit: 10 
            });
            const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
            
            if (monthlyPrice) {
                const subscription = await stripe.subscriptions.create({
                    customer: customer.id,
                    items: [{ price: monthlyPrice.id }],
                    metadata: {
                        supabase_user_id: 'test-user-id',
                        test: 'true'
                    }
                });
                
                logSuccess(`Created test subscription: ${subscription.id}`);
            }
        }
        
    } catch (error) {
        logError(`Failed to create test customer: ${error.message}`);
    }
}

async function showBillingStats() {
    log('Billing Statistics');
    log('=================');
    
    try {
        // Stripe stats
        const customers = await stripe.customers.list({ limit: 100 });
        const subscriptions = await stripe.subscriptions.list({ limit: 100 });
        const activeSubscriptions = subscriptions.data.filter(s => s.status === 'active');
        
        logInfo(`Total Customers: ${customers.data.length}`);
        logInfo(`Total Subscriptions: ${subscriptions.data.length}`);
        logInfo(`Active Subscriptions: ${activeSubscriptions.length}`);
        
        // Supabase stats
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('subscription_status, subscription_plan, credits_remaining');
        
        if (!profilesError) {
            const activeProfiles = profiles.filter(p => p.subscription_status === 'active');
            const freeProfiles = profiles.filter(p => p.subscription_status === 'inactive');
            
            logInfo(`Total Profiles: ${profiles.length}`);
            logInfo(`Active Subscriptions: ${activeProfiles.length}`);
            logInfo(`Free Users: ${freeProfiles.length}`);
            
            // Plan breakdown
            const planStats = {};
            activeProfiles.forEach(profile => {
                const plan = profile.subscription_plan || 'unknown';
                planStats[plan] = (planStats[plan] || 0) + 1;
            });
            
            logInfo('Plan Breakdown:');
            Object.entries(planStats).forEach(([plan, count]) => {
                logInfo(`  ${plan}: ${count}`);
            });
        }
        
    } catch (error) {
        logError(`Failed to get billing stats: ${error.message}`);
    }
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'customers':
            await listCustomers();
            break;
            
        case 'subscriptions':
            await listSubscriptions();
            break;
            
        case 'sync':
            await syncCustomerData();
            break;
            
        case 'update-status':
            await updateSubscriptionStatus();
            break;
            
        case 'test-customer':
            await createTestCustomer();
            break;
            
        case 'stats':
            await showBillingStats();
            break;
            
        case 'all':
            await showBillingStats();
            console.log('');
            await syncCustomerData();
            console.log('');
            await updateSubscriptionStatus();
            break;
            
        default:
            log('Billing Management Script');
            log('');
            log('Usage: node billing-manager.js <command>');
            log('');
            log('Commands:');
            log('  customers      - List all Stripe customers');
            log('  subscriptions  - List all Stripe subscriptions');
            log('  sync           - Sync customer data between Stripe and Supabase');
            log('  update-status  - Update subscription status in Supabase');
            log('  test-customer  - Create a test customer and subscription');
            log('  stats          - Show billing statistics');
            log('  all            - Run sync and update-status');
            log('');
            log('Environment Variables Required:');
            log('  STRIPE_SECRET_KEY - Your Stripe secret key');
            log('  SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key');
            log('');
            log('Examples:');
            log('  node billing-manager.js customers');
            log('  node billing-manager.js sync');
            log('  node billing-manager.js stats');
            log('  node billing-manager.js all');
            break;
    }
}

// Run the script
main().catch(console.error);
