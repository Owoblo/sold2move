#!/usr/bin/env node

// Stripe Products Setup Script
// This script creates products and pricing in Stripe for the Sold2Move platform

import Stripe from 'stripe';

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

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    logError('STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

// Product definitions
const products = [
    {
        name: 'Sold2Move Starter',
        description: 'Perfect for small moving companies getting started',
        features: [
            '100 credits per month',
            'Just Listed properties',
            'Sold properties',
            'Basic filtering',
            'CSV export',
            'Email support'
        ],
        pricing: {
            monthly: 29,
            yearly: 290 // 2 months free
        },
        credits: 100,
        limits: {
            justListed: 100,
            sold: 50
        }
    },
    {
        name: 'Sold2Move Professional',
        description: 'Ideal for growing moving companies',
        features: [
            '500 credits per month',
            'Just Listed properties',
            'Sold properties',
            'Advanced filtering',
            'Bulk operations',
            'CSV export',
            'Priority support',
            'Multiple service areas'
        ],
        pricing: {
            monthly: 79,
            yearly: 790 // 2 months free
        },
        credits: 500,
        limits: {
            justListed: 500,
            sold: 250
        }
    },
    {
        name: 'Sold2Move Enterprise',
        description: 'For large moving companies with high volume needs',
        features: [
            'Unlimited credits',
            'Just Listed properties',
            'Sold properties',
            'Advanced filtering',
            'Bulk operations',
            'CSV export',
            'Dedicated support',
            'Unlimited service areas',
            'API access',
            'Custom integrations'
        ],
        pricing: {
            monthly: 199,
            yearly: 1990 // 2 months free
        },
        credits: -1, // -1 means unlimited
        limits: {
            justListed: -1,
            sold: -1
        }
    }
];

// Credit packages
const creditPackages = [
    {
        name: 'Credit Top-up - 50 Credits',
        description: 'Additional credits for your account',
        credits: 50,
        price: 15
    },
    {
        name: 'Credit Top-up - 100 Credits',
        description: 'Additional credits for your account',
        credits: 100,
        price: 25
    },
    {
        name: 'Credit Top-up - 250 Credits',
        description: 'Additional credits for your account',
        credits: 250,
        price: 50
    },
    {
        name: 'Credit Top-up - 500 Credits',
        description: 'Additional credits for your account',
        credits: 500,
        price: 90
    }
];

async function createProduct(productData) {
    try {
        logInfo(`Creating product: ${productData.name}`);
        
        const product = await stripe.products.create({
            name: productData.name,
            description: productData.description,
            metadata: {
                credits: productData.credits.toString(),
                justListedLimit: productData.limits.justListed.toString(),
                soldLimit: productData.limits.sold.toString(),
                features: JSON.stringify(productData.features)
            }
        });

        logSuccess(`Created product: ${product.name} (${product.id})`);

        // Create monthly pricing
        const monthlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: productData.pricing.monthly * 100, // Convert to cents
            currency: 'usd',
            recurring: {
                interval: 'month'
            },
            metadata: {
                billing_interval: 'monthly',
                credits: productData.credits.toString()
            }
        });

        logSuccess(`Created monthly price: $${productData.pricing.monthly}/month (${monthlyPrice.id})`);

        // Create yearly pricing
        const yearlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: productData.pricing.yearly * 100, // Convert to cents
            currency: 'usd',
            recurring: {
                interval: 'year'
            },
            metadata: {
                billing_interval: 'yearly',
                credits: productData.credits.toString()
            }
        });

        logSuccess(`Created yearly price: $${productData.pricing.yearly}/year (${yearlyPrice.id})`);

        return {
            product,
            monthlyPrice,
            yearlyPrice
        };

    } catch (error) {
        logError(`Failed to create product ${productData.name}: ${error.message}`);
        throw error;
    }
}

async function createCreditPackage(packageData) {
    try {
        logInfo(`Creating credit package: ${packageData.name}`);
        
        const product = await stripe.products.create({
            name: packageData.name,
            description: packageData.description,
            metadata: {
                type: 'credit_package',
                credits: packageData.credits.toString()
            }
        });

        logSuccess(`Created credit package: ${product.name} (${product.id})`);

        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: packageData.price * 100, // Convert to cents
            currency: 'usd',
            metadata: {
                type: 'credit_package',
                credits: packageData.credits.toString()
            }
        });

        logSuccess(`Created credit package price: $${packageData.price} (${price.id})`);

        return {
            product,
            price
        };

    } catch (error) {
        logError(`Failed to create credit package ${packageData.name}: ${error.message}`);
        throw error;
    }
}

async function listExistingProducts() {
    try {
        logInfo('Fetching existing products...');
        const products = await stripe.products.list({ limit: 100 });
        const prices = await stripe.prices.list({ limit: 100 });
        
        logInfo(`Found ${products.data.length} existing products and ${prices.data.length} prices`);
        
        return { products: products.data, prices: prices.data };
    } catch (error) {
        logError(`Failed to fetch existing products: ${error.message}`);
        return { products: [], prices: [] };
    }
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            log('Creating Stripe products and pricing...');
            
            try {
                // Create subscription products
                for (const productData of products) {
                    await createProduct(productData);
                    console.log(''); // Add spacing
                }
                
                // Create credit packages
                for (const packageData of creditPackages) {
                    await createCreditPackage(packageData);
                    console.log(''); // Add spacing
                }
                
                logSuccess('All products and pricing created successfully!');
                
            } catch (error) {
                logError(`Failed to create products: ${error.message}`);
                process.exit(1);
            }
            break;
            
        case 'list':
            await listExistingProducts();
            break;
            
        case 'cleanup':
            logWarning('This will delete ALL products and prices in your Stripe account!');
            logWarning('Only run this in development/test mode!');
            
            const { products: existingProducts, prices: existingPrices } = await listExistingProducts();
            
            // Delete all prices first
            for (const price of existingPrices) {
                try {
                    await stripe.prices.update(price.id, { active: false });
                    logInfo(`Deactivated price: ${price.id}`);
                } catch (error) {
                    logError(`Failed to deactivate price ${price.id}: ${error.message}`);
                }
            }
            
            // Delete all products
            for (const product of existingProducts) {
                try {
                    await stripe.products.del(product.id);
                    logInfo(`Deleted product: ${product.name} (${product.id})`);
                } catch (error) {
                    logError(`Failed to delete product ${product.id}: ${error.message}`);
                }
            }
            
            logSuccess('Cleanup completed!');
            break;
            
        default:
            log('Stripe Products Setup Script');
            log('');
            log('Usage: node setup-stripe-products.js <command>');
            log('');
            log('Commands:');
            log('  create   - Create all products and pricing');
            log('  list     - List existing products and prices');
            log('  cleanup  - Delete all products and prices (DANGER!)');
            log('');
            log('Environment Variables Required:');
            log('  STRIPE_SECRET_KEY - Your Stripe secret key');
            log('');
            log('Examples:');
            log('  node setup-stripe-products.js create');
            log('  node setup-stripe-products.js list');
            log('  node setup-stripe-products.js cleanup');
            break;
    }
}

// Run the script
main().catch(console.error);
