#!/usr/bin/env node

// Script to help set environment variables for Supabase Edge Functions
// This script provides the exact commands and values needed

console.log('🔧 SUPABASE EDGE FUNCTION ENVIRONMENT VARIABLES SETUP');
console.log('====================================================');
console.log('');

console.log('📋 Required Environment Variables:');
console.log('');

console.log('1. STRIPE_SECRET_KEY');
console.log('   Value: Your Stripe secret key from .env file');
console.log('   Command: Set this in Supabase Dashboard → Functions → create-checkout-session-fixed → Settings → Environment Variables');
console.log('');

console.log('2. SUPABASE_URL');
console.log('   Value: https://idbyrtwdeeruiutoukct.supabase.co');
console.log('   Command: Set this in Supabase Dashboard → Functions → create-checkout-session-fixed → Settings → Environment Variables');
console.log('');

console.log('3. SUPABASE_ANON_KEY');
console.log('   Value: Your Supabase anon key');
console.log('   Command: Set this in Supabase Dashboard → Functions → create-checkout-session-fixed → Settings → Environment Variables');
console.log('');

console.log('4. SITE_URL');
console.log('   Value: https://sold2move.com (or http://localhost:5173 for development)');
console.log('   Command: Set this in Supabase Dashboard → Functions → create-checkout-session-fixed → Settings → Environment Variables');
console.log('');

console.log('🔗 Dashboard Links:');
console.log('Functions Dashboard: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/functions');
console.log('create-checkout-session-fixed: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/functions/create-checkout-session-fixed');
console.log('');

console.log('📝 Steps to Set Environment Variables:');
console.log('1. Go to the function dashboard link above');
console.log('2. Click on "create-checkout-session-fixed" function');
console.log('3. Go to "Settings" tab');
console.log('4. Scroll down to "Environment Variables" section');
console.log('5. Add each variable with the values above');
console.log('6. Click "Save" after adding each variable');
console.log('');

console.log('⚠️  Important Notes:');
console.log('- Make sure to use your actual Stripe secret key (starts with sk_live_)');
console.log('- The SUPABASE_ANON_KEY should be from your project settings');
console.log('- After setting variables, the function will automatically redeploy');
console.log('');

console.log('🧪 Test the Function:');
console.log('After setting the environment variables, test the checkout flow again.');
console.log('The 500 error should be resolved.');
