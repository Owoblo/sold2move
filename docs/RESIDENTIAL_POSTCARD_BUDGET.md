# Residential postcard budget and operating policy

The owner’s priority is residential postcards with an economical once-weekly acquisition cycle. Rental now has its own weekly current-occupant campaign; commercial acquisition remains manual-only.

## Schedule and reuse

- Core residential regions: Monday at 14:00 UTC.
- Ottawa: Monday at 16:30 UTC; its workflow shares the core workflow’s concurrency group.
- There is no Tuesday confirmation scrape. First-disappearance sold detection remains enabled.
- Do not launch the inventory-only workflow followed by another fresh full scrape to generate print files. Use the full pipeline once.
- Artwork-only changes use `postcard-reprint.yml` and an existing run’s CSV. This makes no Apify or OpenAI calls and does not update listing/mail lifecycle state.
- When acquisition/classification already succeeded but output failed, reuse the saved database data with `skip_scrape`, `skip_photos`, and `skip_furniture` enabled. Address and mailing-history validation still run.

## Cost reporting

The owner's $200 monthly target is an operating goal, not an application-enforced cap. At the owner's request on September 5, 2026, the newly added $200 Apify account limit was undone and the pre-existing $400 account setting restored and verified. Workflow budget preflights were removed. Weekly residential schedules remain. Rental is now weekly on Tuesday under its own current-occupant policy; commercial remains manual-only.

Every inventory and detail actor run is recorded by its exact ID before polling, including failed attempts. After each residential workflow job, `postcard-cost-report.cjs` reads those runs' `usageTotalUsd` values and produces an area/stage breakdown, total, failed-run count, and account billing-cycle usage. Reports go to business@starmovers.ca, the GitHub job summary, and downloadable JSON/Markdown artifacts. Printer emails do not contain financial reports. The all-area inventory workflow sends a combined seven-area report; the full pipeline sends one report per regional job, including Ottawa.

Missing or still-running charges are labeled incomplete, never silently treated as a final zero. Account usage includes other account activity; it is not used to estimate this scrape's cost. Local full-pipeline and all-area runs print and save the report without emailing automatically. The reporter only reads billing data and never starts actors. Reprinting artwork has no acquisition calls.

Reported costs are Apify actor usage at report time, not the entire invoice. OpenAI, printing, postage, subscriptions, taxes, and separate storage/data-transfer charges are excluded. Apify API reference: https://docs.apify.com/api/v2/actor-run-get .

## Observed cost and waste

September 5 full residential pipeline: $31.2018 inventory searches plus $3.1656 detail fetching = $34.3674 actor usage. Four comparable weekly runs are about $137.47; five are about $171.84, before other provider/service charges. Ottawa’s detail fetching was partially curtailed by the then-applicable usage limit, so these figures are a baseline, not a guaranteed fully completed run price.

The separate initial inventory-only pass cost another $31.2086. Reprinting and the WKG output retry added no Apify actor costs.

Border spillover is a remaining cost issue: Windsor returned 4,221 Michigan rows, Sarnia 573 out-of-province rows, and Chatham 131 Michigan rows that were discarded after paid acquisition. At $0.0017/result, that is about $8.37 per scan. Do not shrink geography or switch search methods without validating Canadian inventory coverage: incomplete coverage can create false sold candidates under first-disappearance inference. No paid coverage experiment was performed during this budget fix.

## Reliability

The mailing-history query now uses 250-row pages and at most three attempts per page. Exhausted retries still hold the batch. Regression tests verify that retry recovery continues rejecting already-mailed addresses and that persistent failures never authorize a mailing.

Checks: `node scripts/test-postcard-cost-report.cjs` and `npm run test:postcard`.
