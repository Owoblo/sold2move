#!/usr/bin/env node

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

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
      { unit_amount: 4900, currency: 'cad', recurring: { interval: 'month' }, lookup_key: 'starter_monthly' },
      { unit_amount: 49000, currency: 'cad', recurring: { interval: 'year' }, lookup_key: 'starter_yearly' },
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
      { unit_amount: 9900, currency: 'cad', recurring: { interval: 'month' }, lookup_key: 'professional_monthly' },
      { unit_amount: 99000, currency: 'cad', recurring: { interval: 'year' }, lookup_key: 'professional_yearly' },
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
      { unit_amount: 29900, currency: 'cad', recurring: { interval: 'month' }, lookup_key: 'enterprise_monthly' },
      { unit_amount: 299000, currency: 'cad', recurring: { interval: 'year' }, lookup_key: 'enterprise_yearly' },
    ],
  },
  // Credit Packages (One-time purchases)
  {
    product: {
      name: 'Credit Pack 100',
      description: '100 credits for revealing properties.',
      metadata: {
        plan_type: 'one_time_credits',
        credits_amount: '100',
      },
    },
    prices: [
      { unit_amount: 2000, currency: 'cad', recurring: null, lookup_key: 'credit_pack_100' },
    ],
  },
  {
    product: {
      name: 'Credit Pack 500',
      description: '500 credits for revealing properties (20% discount).',
      metadata: {
        plan_type: 'one_time_credits',
        credits_amount: '500',
      },
    },
    prices: [
      { unit_amount: 8000, currency: 'cad', recurring: null, lookup_key: 'credit_pack_500' },
    ],
  },
  {
    product: {
      name: 'Credit Pack 1000',
      description: '1000 credits for revealing properties (30% discount).',
      metadata: {
        plan_type: 'one_time_credits',
        credits_amount: '1000',
      },
    },
    prices: [
      { unit_amount: 14000, currency: 'cad', recurring: null, lookup_key: 'credit_pack_1000' },
    ],
  },
  {
    product: {
      name: 'Credit Pack 2500',
      description: '2500 credits for revealing properties (40% discount).',
      metadata: {
        plan_type: 'one_time_credits',
        credits_amount: '2500',
      },
    },
    prices: [
      { unit_amount: 30000, currency: 'cad', recurring: null, lookup_key: 'credit_pack_2500' },
    ],
  },
];

async function createStripeProductsAndPrices() {
  console.log('🚀 Creating Stripe products and prices...');
  console.log('');

  const createdProducts = [];
  const createdPrices = [];

  for (const item of productsAndPrices) {
    try {
      // Check if product already exists by name
      const existingProducts = await stripe.products.list({ 
        active: true,
        limit: 100 
      });
      
      let product = existingProducts.data.find(p => p.name === item.product.name);

      if (product) {
        console.log(`✅ Product "${product.name}" already exists with ID: ${product.id}`);
      } else {
        product = await stripe.products.create(item.product);
        console.log(`✅ Created product: ${product.name} (ID: ${product.id})`);
      }

      createdProducts.push({
        name: product.name,
        id: product.id,
        description: product.description
      });

      for (const priceData of item.prices) {
        // Check if price already exists by lookup_key
        const existingPrices = await stripe.prices.list({ 
          lookup_keys: [priceData.lookup_key], 
          limit: 1 
        });
        
        if (existingPrices.data.length > 0) {
          const existingPrice = existingPrices.data[0];
          console.log(`ℹ️  Price with lookup_key "${priceData.lookup_key}" already exists with ID: ${existingPrice.id}`);
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
              ...item.product.metadata,
            },
          });
          console.log(`  ✅ Created price for ${product.name}: ${price.id} (Lookup Key: ${priceData.lookup_key})`);
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
      console.error(`❌ Error creating product or price for "${item.product.name}": ${error.message}`);
    }
  }

  console.log('');
  console.log('🎉 Stripe product and price creation complete!');
  console.log('');

  // Display summary
  console.log('📋 PRODUCTS SUMMARY:');
  console.log('====================');
  createdProducts.forEach(product => {
    console.log(`• ${product.name} (${product.id})`);
  });

  console.log('');
  console.log('💰 PRICES SUMMARY:');
  console.log('==================');
  createdPrices.forEach(price => {
    const amount = (price.amount / 100).toFixed(2);
    const interval = price.interval === 'one-time' ? 'one-time' : `/${price.interval}`;
    console.log(`• ${price.lookup_key}: $${amount} CAD${interval} (${price.price_id})`);
  });

  console.log('');
  console.log('🔧 NEXT STEPS:');
  console.log('==============');
  console.log('1. Copy the price IDs above to your BillingLive.jsx component');
  console.log('2. Deploy your edge functions to Supabase');
  console.log('3. Set up webhooks in your Stripe Dashboard');
  console.log('4. Test the billing flow in your application');
  console.log('');

  return { products: createdProducts, prices: createdPrices };
}

// Run the script
createStripeProductsAndPrices().catch(console.error);
