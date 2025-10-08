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

async function createCreditPrices() {
  console.log('🚀 Creating credit package prices...');
  console.log('');

  const creditPacks = [
    { name: 'Credit Pack 100', amount: 2000, credits: 100, lookup_key: 'credit_pack_100', productId: 'prod_TCFx0AI2cB5ji9' },
    { name: 'Credit Pack 500', amount: 8000, credits: 500, lookup_key: 'credit_pack_500', productId: 'prod_TCFx42d3U3kRE6' },
    { name: 'Credit Pack 1000', amount: 14000, credits: 1000, lookup_key: 'credit_pack_1000', productId: 'prod_TCFxRalrTkxkuo' },
    { name: 'Credit Pack 2500', amount: 30000, credits: 2500, lookup_key: 'credit_pack_2500', productId: 'prod_TCFxN8C7mtMK3Q' }
  ];

  const createdPrices = [];

  for (const pack of creditPacks) {
    try {
      // Check if price already exists
      const existingPrices = await stripe.prices.list({ 
        lookup_keys: [pack.lookup_key], 
        limit: 1 
      });
      
      if (existingPrices.data.length > 0) {
        console.log(`ℹ️  Price ${pack.lookup_key} already exists: ${existingPrices.data[0].id}`);
        createdPrices.push({
          lookup_key: pack.lookup_key,
          price_id: existingPrices.data[0].id,
          amount: pack.amount,
          credits: pack.credits
        });
      } else {
        const price = await stripe.prices.create({
          product: pack.productId,
          unit_amount: pack.amount,
          currency: 'cad',
          lookup_key: pack.lookup_key,
          metadata: {
            credits_amount: pack.credits.toString(),
            plan_type: 'one_time_credits'
          }
        });
        console.log(`✅ Created ${pack.name} price: ${price.id}`);
        createdPrices.push({
          lookup_key: pack.lookup_key,
          price_id: price.id,
          amount: pack.amount,
          credits: pack.credits
        });
      }
    } catch (error) {
      console.error(`❌ Error creating ${pack.name}: ${error.message}`);
    }
  }

  console.log('');
  console.log('💰 CREDIT PACKAGES SUMMARY:');
  console.log('============================');
  createdPrices.forEach(price => {
    const amount = (price.amount / 100).toFixed(2);
    console.log(`• ${price.lookup_key}: $${amount} CAD for ${price.credits} credits (${price.price_id})`);
  });

  return createdPrices;
}

// Run the script
createCreditPrices().catch(console.error);
