#!/usr/bin/env node

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

console.log('🔑 Testing Stripe connection...');
console.log('Key format:', stripeSecretKey.substring(0, 20) + '...');
console.log('Key length:', stripeSecretKey.length);

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

try {
  const account = await stripe.accounts.retrieve();
  console.log('✅ Connected to Stripe account:', account.display_name || account.id);
  console.log('Account type:', account.type);
  console.log('Country:', account.country);
  console.log('Currency:', account.default_currency);
} catch (error) {
  console.error('❌ Stripe connection failed:', error.message);
  console.error('Error type:', error.type);
  if (error.code) {
    console.error('Error code:', error.code);
  }
}
