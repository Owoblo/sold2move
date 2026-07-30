#!/usr/bin/env node
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');

const project = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const migrationPath = process.argv[2];
if (!project || !token || !migrationPath) {
  throw new Error('Usage: SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... node scripts/apply-supabase-migration.cjs <migration.sql>');
}
const sql = fs.readFileSync(path.resolve(migrationPath), 'utf8');
const body = JSON.stringify({ query: sql });
const request = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${project}/database/query`,
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
}, response => {
  let result = '';
  response.on('data', chunk => { result += chunk; });
  response.on('end', () => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP ${response.statusCode}: ${result.slice(0, 1000)}`);
    }
    console.log(JSON.stringify({ applied: true, migration: migrationPath }));
  });
});
request.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
request.end(body);
