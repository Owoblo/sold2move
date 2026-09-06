# Commercial outgoing-business campaign

Manual workflow: `commercial-market-pipeline.yml`. The first campaign can review all fresh lease inventory with `initial_campaign=true`; subsequent campaigns require new or relisted inventory. Recurring acquisition remains manual until the combined residential, rental and commercial spend has been measured against the owner's $200 USD monthly preference. There is no application spend cap.

The six regions are Windsor, Chatham, Sarnia, London, Woodstock and Kitchener/Waterloo/Cambridge/Guelph. REALTOR acquisition uses 52 lease searches; Spacelist supplements 15 cities. Requested communities without an individual search are labeled regional-search-only, not verified coverage. A failed REALTOR acquisition prevents import and postcard generation. Partial Spacelist coverage cannot advance disappearance tracking for that region.

A postcard requires a specific unit or exclusive whole premises, a complete Ontario delivery address, strong evidence of current business occupancy, and a likely outgoing transition. Furniture alone, vacant space, investment sales with tenants staying and ambiguous multi-unit addresses do not qualify. AI uncertainty and failed checks remain visible holds. Removal from the market is tracking only; it never automatically prints a second commercial postcard.

Evidence fingerprints and 30-day caches reduce repeated details and AI calls. Changed evidence is reassessed. Classification checks every eligible lease candidate, without a 600-record cutoff. Acquisition, details and failed Apify runs are included in the dollar report. OpenAI, print and postage are separate.

Postcards use Saturn Star branding and “The Business Owner,” with exact unit labels. Owner review goes to business@starmovers.ca. A generated batch is not proof of physical mailing. Address/source history suppresses repeats for 180 days, and batch reservation is transactional.

To re-render saved artwork locally (no network, AI, database or new recipients):

```sh
node scripts/commercial-artwork.cjs /path/to/commercial-batch.json /path/to/output
```

The recipient hash must match. To resume details/screening, dispatch with `source_run_id` set to the original GitHub run. Successful detail and assessment caches are reused. Supplemental batches suppress already reserved addresses. To recover a failed acquisition, also set `recover_inventory=true`; completed search checkpoints are reused and failed searches are retried. Acquisition recovery refuses snapshots already imported into lifecycle tracking or older than eight days.

Validation dispatch: `validate_only=true`. This runs eligibility, duplicate/history, saved replay, 605-record screening, cache, market lifecycle, cost reporting and loader checks, then applies schema and exercises the real import SQL against temporary live-schema tables. No paid acquisition or owner email runs in validation mode.
