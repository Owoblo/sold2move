#!/usr/bin/env node

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const batchId = process.argv[2];
if (!batchId) throw new Error('Usage: node scripts/postcard-confirm-mailed.cjs <batch-id>');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY and Supabase URL are required');

(async () => {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('confirm_postcard_batch_mailed', { p_batch_id: batchId });
  if (error) throw error;
  console.log(`Confirmed mailed batch ${batchId}: ${JSON.stringify(data)}`);
})().catch(error => {
  console.error(`Confirmation failed: ${error.message}`);
  process.exit(1);
});
