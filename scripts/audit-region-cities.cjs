#!/usr/bin/env node
const https = require('node:https');

const project = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!project || !token) throw new Error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required');

const sql = `
  SELECT region,
    COALESCE(NULLIF(lastcity, ''), NULLIF(city, ''), NULLIF(addresscity, '')) AS city,
    count(*)::integer AS listing_count
  FROM listings
  WHERE addressstate = 'ON'
    AND COALESCE(NULLIF(lastcity, ''), NULLIF(city, ''), NULLIF(addresscity, '')) IS NOT NULL
    AND region IN ('windsor', 'chatham', 'sarnia', 'london', 'woodstock', 'wkg', 'ottawa')
  GROUP BY region, COALESCE(NULLIF(lastcity, ''), NULLIF(city, ''), NULLIF(addresscity, ''))
  ORDER BY region, city;
`;
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
  let data = '';
  response.on('data', chunk => { data += chunk; });
  response.on('end', () => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP ${response.statusCode}: ${data.slice(0, 1000)}`);
    }
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});
request.on('error', error => { console.error(error.message); process.exitCode = 1; });
request.end(body);
