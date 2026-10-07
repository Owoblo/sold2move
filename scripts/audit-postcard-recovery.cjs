#!/usr/bin/env node
// Read-only database evidence for the missed October catch-up run.
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const query = `BEGIN READ ONLY;
SET LOCAL statement_timeout = '90s';
SELECT region, status, count(*) AS total,
 count(*) FILTER (WHERE lastseenat >= '2026-09-23' AND lastseenat < '2026-10-07') AS original_window,
 count(*) FILTER (WHERE lastseenat >= '2026-09-23' AND lastseenat < '2026-10-08') AS corrected_window,
 count(*) FILTER (WHERE first_seen_at >= '2026-09-23') AS first_seen_last_two_weeks,
 count(*) FILTER (WHERE lastseenat >= '2026-10-07' AND glitch_suspected = false AND (unformattedprice >= 300000 OR unformattedprice = 0)) AS current_above_price_not_glitch,
 count(*) FILTER (WHERE status = 'just_listed' AND just_listed_postcard_sent_at IS NULL AND lastseenat >= '2026-10-07') AS current_unmailed_new,
 min(lastseenat) AS oldest_observation, max(lastseenat) AS latest_observation
FROM public.listings
WHERE region IN ('windsor','chatham','sarnia','london','woodstock','wkg','ottawa','toronto')
GROUP BY region,status ORDER BY region,status;
COMMIT;`;
  const response = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw Error(`Read-only database audit HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
  const rows = await response.json();
  const out = path.join(__dirname, '..', 'reports', 'monday-readiness');
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'recovery-database-audit.json'),JSON.stringify({checked_at:new Date().toISOString(),rows},null,2));
  console.log(JSON.stringify(rows,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
