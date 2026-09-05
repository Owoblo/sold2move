# Residential postcard budget and operating policy

The owner’s priority is residential postcards with an economical once-weekly acquisition cycle. Rental and commercial acquisition are manual-only while those campaigns are refined.

## Schedule and reuse

- Core residential regions: Monday at 14:00 UTC.
- Ottawa: Monday at 16:30 UTC; its workflow shares the core workflow’s concurrency group.
- There is no Tuesday confirmation scrape. First-disappearance sold detection remains enabled.
- Do not launch the inventory-only workflow followed by another fresh full scrape to generate print files. Use the full pipeline once.
- Artwork-only changes use `postcard-reprint.yml` and an existing run’s CSV. This makes no Apify or OpenAI calls and does not update listing/mail lifecycle state.
- When acquisition/classification already succeeded but output failed, reuse the saved database data with `skip_scrape`, `skip_photos`, and `skip_furniture` enabled. Address and mailing-history validation still run.

## Budget control

The Apify account’s hard monthly usage limit was reduced from $400 to $200 and verified on September 5, 2026. The current billing cycle is August 31–September 29 UTC. At verification, usage was $199.53, leaving approximately $0.47. No new acquisition should run in that cycle.

`check-apify-budget.cjs` reads current account usage before paid workflow acquisition. It uses the lower of $200 and the account’s configured limit. Missing credentials, malformed usage, API failures, or insufficient headroom block acquisition. Artwork reprints and pipeline retries with both scraping and details disabled remain available.

The preflight requires conservative regional headroom: Windsor $14, Chatham $3, Sarnia $3, London $7, Woodstock $3, WKG $8, Ottawa $9. These are start thresholds based on observed runs with a buffer, not guaranteed per-run prices or reserved account funds. Apify’s account-side limit remains the shared enforcement mechanism for concurrent jobs and other callers.

This control covers Apify platform usage. OpenAI charges, subscriptions, taxes, printing, and postage are separate and are not proven to fit inside the same $200 total by this audit. Actual OpenAI billing was not available. Do not describe the Apify cap as a combined provider billing cap.

## Observed cost and waste

September 5 full residential pipeline: $31.2018 inventory searches plus $3.1656 detail fetching = $34.3674 actor usage. Four comparable weekly runs are about $137.47; five are about $171.84, before other provider/service charges. Ottawa’s detail fetching was partially curtailed by the then-applicable usage limit, so these figures are a baseline, not a guaranteed fully completed run price.

The separate initial inventory-only pass cost another $31.2086. Reprinting and the WKG output retry added no Apify actor costs.

Border spillover is a remaining cost issue: Windsor returned 4,221 Michigan rows, Sarnia 573 out-of-province rows, and Chatham 131 Michigan rows that were discarded after paid acquisition. At $0.0017/result, that is about $8.37 per scan. Do not shrink geography or switch search methods without validating Canadian inventory coverage: incomplete coverage can create false sold candidates under first-disappearance inference. No paid coverage experiment was performed during this budget fix.

## Reliability

The mailing-history query now uses 250-row pages and at most three attempts per page. Exhausted retries still hold the batch. Regression tests verify that retry recovery continues rejecting already-mailed addresses and that persistent failures never authorize a mailing.

Checks: `node scripts/test-apify-budget.cjs` and `npm run test:postcard`.
