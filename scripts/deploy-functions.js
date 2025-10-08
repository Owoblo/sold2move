#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use service role key for admin operations
const supabase = createClient(
  'https://idbyrtwdeeruiutoukct.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI1OTQ2NCwiZXhwIjoyMDUzODM1NDY0fQ.WiJMUqoCxlI-FFtD7riPkds-qXcrSHB8f6RyXLhryvc',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

async function deployFunction(functionName, functionCode) {
  console.log(`🚀 Deploying function: ${functionName}`);
  
  try {
    // Read the function code
    const functionPath = path.join(__dirname, '..', 'edge-functions', `${functionName}.ts`);
    const code = fs.readFileSync(functionPath, 'utf8');
    
    console.log(`📝 Function code loaded (${code.length} characters)`);
    
    // For now, we'll create a simple deployment script
    // The actual deployment would require Supabase CLI or Management API
    console.log(`✅ Function ${functionName} ready for deployment`);
    console.log(`📋 Code preview: ${code.substring(0, 100)}...`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error deploying ${functionName}:`, error.message);
    return false;
  }
}

async function deployAllFunctions() {
  console.log('🚀 DEPLOYING ALL EDGE FUNCTIONS');
  console.log('===============================');
  
  const functions = [
    'create-checkout-session-fixed',
    'create-portal-session', 
    'stripe-webhook'
  ];
  
  for (const func of functions) {
    const success = await deployFunction(func, '');
    if (!success) {
      console.log(`❌ Failed to deploy ${func}`);
      return false;
    }
  }
  
  console.log('');
  console.log('✅ ALL FUNCTIONS READY FOR DEPLOYMENT');
  console.log('=====================================');
  console.log('');
  console.log('📋 MANUAL DEPLOYMENT STEPS:');
  console.log('1. Go to: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/functions');
  console.log('2. Create each function with the code from edge-functions/ folder');
  console.log('3. Set environment variables as shown in MANUAL_DEPLOYMENT_GUIDE.md');
  console.log('');
  console.log('🔧 ALTERNATIVE: Use Supabase CLI with personal access token');
  console.log('Get personal access token from: https://supabase.com/dashboard/account/tokens');
  
  return true;
}

deployAllFunctions();