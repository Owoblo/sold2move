#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize clients
const supabaseUrl = process.env.SUPABASE_URL || 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

async function setupStripeWebhook() {
  console.log('🔗 Setting up Stripe webhook...');
  
  try {
    // Check if webhook already exists
    const webhooks = await stripe.webhooks.list();
    const existingWebhook = webhooks.data.find(webhook => 
      webhook.url.includes('idbyrtwdeeruiutoukct.supabase.co/functions/v1/stripe-webhook')
    );
    
    if (existingWebhook) {
      console.log('✅ Webhook already exists:', existingWebhook.id);
      return existingWebhook.secret;
    }
    
    // Create new webhook
    const webhook = await stripe.webhooks.create({
      url: 'https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/stripe-webhook',
      enabled_events: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'checkout.session.completed',
      ],
    });
    
    console.log('✅ Webhook created:', webhook.id);
    console.log('🔑 Webhook secret:', webhook.secret);
    
    return webhook.secret;
    
  } catch (error) {
    console.error('❌ Failed to create webhook:', error.message);
    return null;
  }
}

async function testDatabaseConnection() {
  console.log('🗄️  Testing database connection...');
  
  try {
    // Test with a simple query that should work
    const { data, error } = await supabase
      .from('profiles')
      .select('id, company_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    console.log(`   Found ${data.length} profile(s) in database`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

async function createTestCustomer() {
  console.log('👤 Creating test customer...');
  
  try {
    const testEmail = `test-${Date.now()}@sold2move.com`;
    
    // Create Stripe customer first
    const customer = await stripe.customers.create({
      email: testEmail,
      metadata: {
        test_customer: 'true'
      }
    });
    
    console.log('✅ Stripe customer created:', customer.id);
    
    return {
      customerId: customer.id,
      email: testEmail
    };
    
  } catch (error) {
    console.error('❌ Failed to create test customer:', error.message);
    return false;
  }
}

async function testBillingFlow() {
  console.log('💳 Testing billing flow...');
  
  try {
    // Create a test checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1SFrRDCUfCzyitr0gM80TZwJ', // Starter monthly
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173/pricing',
      metadata: {
        test_session: 'true'
      }
    });
    
    console.log('✅ Test checkout session created:', session.id);
    console.log('🔗 Test URL:', session.url);
    
    return session;
    
  } catch (error) {
    console.error('❌ Failed to create test session:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 COMPLETE BILLING SYSTEM SETUP');
  console.log('================================');
  console.log('');
  
  // Step 1: Test database connection
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.log('❌ Database connection failed. Please check your configuration.');
    return;
  }
  
  // Step 2: Set up webhook
  const webhookSecret = await setupStripeWebhook();
  
  // Step 3: Create test customer
  const testCustomer = await createTestCustomer();
  
  // Step 4: Test billing flow
  const testSession = await testBillingFlow();
  
  console.log('');
  console.log('🎉 BILLING SYSTEM STATUS:');
  console.log('========================');
  console.log('✅ Database: Connected');
  console.log('✅ Webhook:', webhookSecret ? 'Created' : 'Failed');
  console.log('✅ Test customer:', testCustomer ? 'Created' : 'Failed');
  console.log('✅ Test session:', testSession ? 'Created' : 'Failed');
  console.log('');
  
  if (webhookSecret) {
    console.log('🔑 WEBHOOK SECRET:');
    console.log('==================');
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
    console.log('');
  }
  
  if (testCustomer) {
    console.log('👤 TEST CUSTOMER:');
    console.log('=================');
    console.log(`Email: ${testCustomer.email}`);
    console.log(`Stripe Customer ID: ${testCustomer.customerId}`);
    console.log('');
  }
  
  if (testSession) {
    console.log('💳 TEST CHECKOUT:');
    console.log('=================');
    console.log(`Session ID: ${testSession.id}`);
    console.log(`URL: ${testSession.url}`);
    console.log('');
  }
  
  console.log('🚀 FINAL DEPLOYMENT STEPS:');
  console.log('==========================');
  console.log('1. Go to: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/functions');
  console.log('2. Create these 3 functions:');
  console.log('   - create-checkout-session-fixed');
  console.log('   - create-portal-session');
  console.log('   - stripe-webhook');
  console.log('3. Copy code from MANUAL_DEPLOYMENT_GUIDE.md');
  console.log('4. Set environment variables (including webhook secret above)');
  console.log('5. Deploy each function');
  console.log('');
  console.log('💳 Your billing system will be LIVE once deployed!');
}

// Run the setup
main().catch(console.error);
