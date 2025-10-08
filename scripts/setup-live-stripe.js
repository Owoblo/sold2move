#!/usr/bin/env node

// Live Stripe Setup Script
// This script sets up Stripe products and prices for live mode

import Stripe from 'stripe';
import 'dotenv/config';

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

// Check if we have the Stripe secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    logError('STRIPE_SECRET_KEY environment variable is required');
    log('');
    log('Please set your Stripe secret key:');
    log('export STRIPE_SECRET_KEY="sk_live_your_secret_key_here"');
    log('');
    log('You can find your secret key at: https://dashboard.stripe.com/apikeys');
    process.exit(1);
}

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
});

// Verify we're using the right key
if (stripeSecretKey.startsWith('sk_live_')) {
    logWarning('⚠️  WARNING: You are using LIVE Stripe keys!');
    logWarning('This will create real products and prices in your live Stripe account.');
    log('');
} else if (stripeSecretKey.startsWith('sk_test_')) {
    logInfo('ℹ️  Using Stripe test keys (safe for development)');
    log('');
} else {
    logError('❌ Invalid Stripe secret key format');
    process.exit(1);
}

// Products and prices configuration
const productsAndPrices = [
    // Subscription Plans
    {
        product: {
            name: 'Starter Plan',
            description: 'Perfect for new movers getting started with lead generation.',
            metadata: {
                plan_type: 'subscription',
                credits_per_month: '500',
                features: '500 credits/month, Basic filters, Email support',
            },
        },
        prices: [
            { unit_amount: 4900, currency: 'usd', recurring: { interval: 'month' }, lookup_key: 'starter_monthly' },
            { unit_amount: 49000, currency: 'usd', recurring: { interval: 'year' }, lookup_key: 'starter_yearly' },
        ],
    },
    {
        product: {
            name: 'Professional Plan',
            description: 'For growing businesses needing more leads and deeper insights.',
            metadata: {
                plan_type: 'subscription',
                credits_per_month: '2000',
                features: '2000 credits/month, Advanced filters, Priority support, CRM integration',
            },
        },
        prices: [
            { unit_amount: 9900, currency: 'usd', recurring: { interval: 'month' }, lookup_key: 'professional_monthly' },
            { unit_amount: 99000, currency: 'usd', recurring: { interval: 'year' }, lookup_key: 'professional_yearly' },
        ],
    },
    {
        product: {
            name: 'Enterprise Plan',
            description: 'Scalable solution for large operations and high-volume lead generation.',
            metadata: {
                plan_type: 'subscription',
                credits_per_month: 'unlimited',
                features: 'Unlimited credits, All features, Dedicated account manager, Custom integrations',
            },
        },
        prices: [
            { unit_amount: 29900, currency: 'usd', recurring: { interval: 'month' }, lookup_key: 'enterprise_monthly' },
            { unit_amount: 299000, currency: 'usd', recurring: { interval: 'year' }, lookup_key: 'enterprise_yearly' },
        ],
    },
    // Credit Packages (One-time purchases)
    {
        product: {
            name: 'Credit Pack 100',
            description: '100 credits for revealing properties.',
            type: 'service',
            metadata: {
                plan_type: 'one_time_credits',
                credits_amount: '100',
            },
        },
        prices: [
            { unit_amount: 2000, currency: 'usd', recurring: null, lookup_key: 'credit_pack_100' },
        ],
    },
    {
        product: {
            name: 'Credit Pack 500',
            description: '500 credits for revealing properties (20% discount).',
            type: 'service',
            metadata: {
                plan_type: 'one_time_credits',
                credits_amount: '500',
            },
        },
        prices: [
            { unit_amount: 8000, currency: 'usd', recurring: null, lookup_key: 'credit_pack_500' },
        ],
    },
    {
        product: {
            name: 'Credit Pack 1000',
            description: '1000 credits for revealing properties (30% discount).',
            type: 'service',
            metadata: {
                plan_type: 'one_time_credits',
                credits_amount: '1000',
            },
        },
        prices: [
            { unit_amount: 14000, currency: 'usd', recurring: null, lookup_key: 'credit_pack_1000' },
        ],
    },
    {
        product: {
            name: 'Credit Pack 2500',
            description: '2500 credits for revealing properties (40% discount).',
            type: 'service',
            metadata: {
                plan_type: 'one_time_credits',
                credits_amount: '2500',
            },
        },
        prices: [
            { unit_amount: 30000, currency: 'usd', recurring: null, lookup_key: 'credit_pack_2500' },
        ],
    },
];

async function createStripeProductsAndPrices() {
    log('Starting Stripe product and price creation...');
    log('');

    const createdProducts = [];
    const createdPrices = [];

    for (const item of productsAndPrices) {
        try {
            // Check if product already exists by name
            const existingProducts = await stripe.products.list({ name: item.product.name, limit: 1 });
            let product;

            if (existingProducts.data.length > 0) {
                product = existingProducts.data[0];
                logSuccess(`✅ Product "${product.name}" already exists with ID: ${product.id}`);
            } else {
                product = await stripe.products.create(item.product);
                logSuccess(`✅ Created product: ${product.name} (ID: ${product.id})`);
            }

            createdProducts.push({
                name: product.name,
                id: product.id,
                description: product.description
            });

            for (const priceData of item.prices) {
                // Check if price already exists by lookup_key
                const existingPrices = await stripe.prices.list({ lookup_keys: [priceData.lookup_key], limit: 1 });
                if (existingPrices.data.length > 0) {
                    const existingPrice = existingPrices.data[0];
                    logInfo(`ℹ️  Price with lookup_key "${priceData.lookup_key}" already exists with ID: ${existingPrice.id}`);
                    createdPrices.push({
                        lookup_key: priceData.lookup_key,
                        price_id: existingPrice.id,
                        amount: existingPrice.unit_amount,
                        currency: existingPrice.currency,
                        interval: existingPrice.recurring?.interval || 'one-time'
                    });
                } else {
                    const price = await stripe.prices.create({
                        product: product.id,
                        unit_amount: priceData.unit_amount,
                        currency: priceData.currency,
                        recurring: priceData.recurring,
                        lookup_key: priceData.lookup_key,
                        metadata: {
                            product_name: product.name,
                            ...item.product.metadata, // Inherit product metadata
                        },
                    });
                    logSuccess(`  ✅ Created price for ${product.name}: ${price.id} (Lookup Key: ${priceData.lookup_key})`);
                    createdPrices.push({
                        lookup_key: priceData.lookup_key,
                        price_id: price.id,
                        amount: priceData.unit_amount,
                        currency: priceData.currency,
                        interval: priceData.recurring?.interval || 'one-time'
                    });
                }
            }
        } catch (error) {
            logError(`❌ Error creating product or price for "${item.product.name}": ${error.message}`);
        }
    }

    log('');
    logSuccess('🎉 Stripe product and price creation complete!');
    log('');

    // Display summary
    log('📋 CREATED PRODUCTS SUMMARY:');
    log('============================');
    createdProducts.forEach(product => {
        log(`• ${product.name} (${product.id})`);
    });

    log('');
    log('💰 CREATED PRICES SUMMARY:');
    log('==========================');
    createdPrices.forEach(price => {
        const amount = (price.amount / 100).toFixed(2);
        const interval = price.interval === 'one-time' ? 'one-time' : `/${price.interval}`;
        log(`• ${price.lookup_key}: $${amount}${interval} (${price.price_id})`);
    });

    log('');
    log('🔧 NEXT STEPS:');
    log('==============');
    log('1. Copy the price IDs above to your BillingEnhanced.jsx component');
    log('2. Deploy your edge functions to Supabase');
    log('3. Set up webhooks in your Stripe Dashboard');
    log('4. Test the billing flow in your application');
    log('');

    return { products: createdProducts, prices: createdPrices };
}

async function listExistingProducts() {
    log('📋 EXISTING STRIPE PRODUCTS:');
    log('============================');
    
    try {
        const products = await stripe.products.list({ limit: 10 });
        if (products.data.length === 0) {
            logInfo('No products found in your Stripe account.');
        } else {
            products.data.forEach(product => {
                log(`• ${product.name} (${product.id}) - ${product.description || 'No description'}`);
            });
        }
    } catch (error) {
        logError(`Failed to list products: ${error.message}`);
    }
    
    log('');
}

async function listExistingPrices() {
    log('💰 EXISTING STRIPE PRICES:');
    log('==========================');
    
    try {
        const prices = await stripe.prices.list({ limit: 20 });
        if (prices.data.length === 0) {
            logInfo('No prices found in your Stripe account.');
        } else {
            prices.data.forEach(price => {
                const amount = (price.unit_amount / 100).toFixed(2);
                const interval = price.recurring?.interval || 'one-time';
                const lookupKey = price.lookup_key || 'no-lookup-key';
                log(`• ${lookupKey}: $${amount}/${interval} (${price.id})`);
            });
        }
    } catch (error) {
        logError(`Failed to list prices: ${error.message}`);
    }
    
    log('');
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            await createStripeProductsAndPrices();
            break;
            
        case 'list':
            await listExistingProducts();
            await listExistingPrices();
            break;
            
        case 'check':
            log('🔍 STRIPE ACCOUNT CHECK:');
            log('========================');
            log('');
            
            try {
                const account = await stripe.accounts.retrieve();
                logSuccess(`✅ Connected to Stripe account: ${account.display_name || account.id}`);
                logInfo(`   Account type: ${account.type}`);
                logInfo(`   Country: ${account.country}`);
                logInfo(`   Currency: ${account.default_currency}`);
                log('');
            } catch (error) {
                logError(`❌ Failed to connect to Stripe: ${error.message}`);
                process.exit(1);
            }
            
            await listExistingProducts();
            await listExistingPrices();
            break;
            
        default:
            log('Stripe Live Setup Script');
            log('');
            log('Usage: node scripts/setup-live-stripe.js <command>');
            log('');
            log('Commands:');
            log('  create  - Create products and prices in Stripe');
            log('  list    - List existing products and prices');
            log('  check   - Check Stripe account connection and list existing items');
            log('');
            log('Examples:');
            log('  node scripts/setup-live-stripe.js check');
            log('  node scripts/setup-live-stripe.js create');
            log('  node scripts/setup-live-stripe.js list');
            log('');
            log('⚠️  WARNING: This script uses LIVE Stripe keys!');
            log('Make sure you have set STRIPE_SECRET_KEY environment variable.');
            break;
    }
}

// Run the script
main().catch(console.error);
