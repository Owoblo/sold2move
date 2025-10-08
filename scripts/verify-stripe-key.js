#!/usr/bin/env node

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

console.log('🔑 Verifying Stripe Secret Key...');
console.log('Key format:', stripeSecretKey ? stripeSecretKey.substring(0, 20) + '...' : 'NOT SET');
console.log('Key length:', stripeSecretKey ? stripeSecretKey.length : 0);

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  process.exit(1);
}

// Test with a simple API call
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

try {
  // Try to retrieve account info
  const account = await stripe.accounts.retrieve();
  console.log('✅ Stripe connection successful!');
  console.log('Account ID:', account.id);
  console.log('Account type:', account.type);
  console.log('Country:', account.country);
  console.log('Currency:', account.default_currency);
  
  // Try to list existing products
  console.log('\n📦 Checking existing products...');
  const products = await stripe.products.list({ limit: 5 });
  console.log(`Found ${products.data.length} existing products:`);
  products.data.forEach(product => {
    console.log(`  - ${product.name} (${product.id})`);
  });
  
} catch (error) {
  console.error('❌ Stripe connection failed:', error.message);
  console.error('Error type:', error.type);
  if (error.code) {
    console.error('Error code:', error.code);
  }
  if (error.statusCode) {
    console.error('Status code:', error.statusCode);
  }
}
