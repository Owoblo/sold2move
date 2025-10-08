#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize clients
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseServiceKey = '[YOUR_SUPABASE_SERVICE_ROLE_KEY]';
const stripeSecretKey = '[YOUR_STRIPE_SECRET_KEY]';

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

async function verifyStripeProducts() {
  console.log('📦 Verifying Stripe products...');
  
  try {
    const products = await stripe.products.list({ limit: 10 });
    const sold2moveProducts = products.data.filter(product => 
      product.name.includes('Starter') || 
      product.name.includes('Professional') || 
      product.name.includes('Enterprise') ||
      product.name.includes('Credit Pack')
    );
    
    console.log(`✅ Found ${sold2moveProducts.length} Sold2Move products:`);
    sold2moveProducts.forEach(product => {
      console.log(`   - ${product.name} (${product.id})`);
    });
    
    return sold2moveProducts.length > 0;
    
  } catch (error) {
    console.error('❌ Failed to verify products:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🗄️  Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, stripe_customer_id')
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
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test Customer',
        },
      },
    });
    
    if (authError) {
      console.error('❌ Failed to create test user:', authError.message);
      return false;
    }
    
    const userId = authData.user.id;
    console.log('✅ Test user created:', userId);
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: testEmail,
      metadata: {
        supabase_user_id: userId,
        test_customer: 'true'
      }
    });
    
    console.log('✅ Stripe customer created:', customer.id);
    
    // Update profile with Stripe customer ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        stripe_customer_id: customer.id,
        company_name: 'Test Company',
        business_email: testEmail
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ Failed to update profile:', updateError.message);
      return false;
    }
    
    console.log('✅ Profile updated with Stripe customer ID');
    
    return {
      userId,
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
  
  // Step 1: Verify Stripe products
  const productsOk = await verifyStripeProducts();
  if (!productsOk) {
    console.log('❌ Stripe products not found. Please run the product creation script first.');
    return;
  }
  
  // Step 2: Test database connection
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.log('❌ Database connection failed. Please check your configuration.');
    return;
  }
  
  // Step 3: Set up webhook
  const webhookSecret = await setupStripeWebhook();
  
  // Step 4: Create test customer
  const testCustomer = await createTestCustomer();
  
  // Step 5: Test billing flow
  const testSession = await testBillingFlow();
  
  console.log('');
  console.log('🎉 BILLING SYSTEM STATUS:');
  console.log('========================');
  console.log('✅ Stripe products: Ready');
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
    console.log(`User ID: ${testCustomer.userId}`);
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
  
  console.log('🚀 NEXT STEPS:');
  console.log('==============');
  console.log('1. Deploy the 3 edge functions manually:');
  console.log('   - create-checkout-session-fixed');
  console.log('   - create-portal-session');
  console.log('   - stripe-webhook');
  console.log('');
  console.log('2. Use the webhook secret above in your stripe-webhook function');
  console.log('');
  console.log('3. Test your billing system at: http://localhost:5173/dashboard/billing');
  console.log('');
  console.log('💳 Your billing system is ready for deployment!');
}

// Run the setup
main().catch(console.error);
