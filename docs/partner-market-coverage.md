# Market data and CRM boundary

Sold2Move owns collection, source agent identities, property attribution, inventory status, event evidence and freshness. The CRM consumes those observations and owns conversations, playbooks, permissions, Sales handoffs and outreach. Do not put a scraper or automatic send in the CRM coverage route.

`refresh-partner-market-coverage.cjs` reads stored residential, rental and commercial inventory. It does not scrape, perform paid research, print, create contacts or send messages. Its read-only CRM join is a coverage projection, not a relationship mutation. It writes a complete daily snapshot only after all sources have loaded successfully. The CRM fetches this projection through a service-only database boundary and applies market access restrictions before returning counts, names or filters.

The coverage workflow runs after successful collection pipelines or a manual dispatch. It does not start those pipelines. Daily snapshots support later trends; comparisons need consistent source coverage, not simply changes in count.

## Measurement contract

- Denominator: unique canonical property/unit within each lane. The same address in residential and rental inventory counts in both lanes. Unit labels stay distinct. This is observed inventory, not an MLS census or moving-job market share.
- All stored active inventory in configured residential regions is included, even if old or postcard-ineligible. Inactive observations use a 30-day window.
- Fresh active: stored active and last observed within 21 days. Older and undated records remain visible as stale.
- First observed is an ingestion timestamp, not a confirmed listing date. Disappearance is not a confirmed sale. Confirmed sales require explicit source evidence.
- Source-backed named representatives count as attributed. CRM linking requires name plus a unique direct identifier, or a previously reviewed property-person association. Shared phone numbers and name-only similarities remain unverified groups.
- Outreach and inbound counts mean recorded history on a linked identity. Inbound may include opt-outs, reactions and automated replies. These are not positive relationship, referral, booking or revenue measures.
- Each property counts once overall and once per participating brokerage. Co-listed properties can give several brokerages credit; shares need not total 100%. Branch names are not merged into franchise families by fuzzy matching.
- Property type uses explicit source evidence. Unknown is retained. Rental contacts may be landlords or property managers, so the interface says representatives, not universally realtors.
- Postcard exclusions remain context. Neither inclusion in this report nor a new listing authorizes contact.

## Reusing the realtors project

Inspected `/Users/owoblo/Downloads/realtors/scrape_realtor.py`, `listing_agent_lookup.py`, and `gta_realtors/enrich.py`.

The directory exports have `individual_id`, `profile_url`, brokerage and public professional contact fields. `realtor-directory-identity.cjs` adapts those saved rows to stable source identities, validates profile ID/host agreement and deduplicates repeat city records. This adapter does not collect individual listings yet.

`gta_realtors/enrich.py` matches a brokerage name against historical listing context. Its `brokerage_snapshot_listing_count` is NOT an individual agent's inventory. `listing_agent_lookup.py` works in the opposite direction: property address to primary/co-listing agents.

The future agent-inventory connector belongs in Sold2Move. Its record contract must include source agent ID, source listing ID, property/unit key, listing URL, agent role, observed timestamp, status evidence, pagination completeness and acquisition scope. Missing pages or failed fetches must not imply sold/removed listings. Use explicit source-agent attribution; brokerage-only matches stay brokerage context. Preserve co-agents and compare only complete, comparable snapshots. No new agent crawl was started by this change.

## Planned corroboration of market events

User direction, October 9, 2026: compare weekly regional inventory AND successive snapshots of each realtor's listings. Use the second view to strengthen or challenge disappearance signals. Preserve this plan for implementation in Sold2Move or the realtor collector; keep CRM ingestion provider-neutral.

Event states should distinguish newly observed, active, missing once, repeatedly missing, possible sale, explicit sold, leased, withdrawn, expired, relisted and unknown. Disappearance from two views is corroboration of removal, not proof of a sale; both views may share the same upstream feed. Store source family so correlated evidence is not treated as independent confirmation. Do not repeat an event on every observation.

Compare complete snapshots with compatible geography, transaction filters and pagination. Failed pages, CAPTCHA/access failure, zero-result anomalies and changed filters suspend negative inference. Require repeated complete observations before escalating removal. Check the same canonical property/unit under another listing ID, another agent and another brokerage before inferring a sale. Preserve old and new IDs and the matching rationale. Explicit sold evidence must retain its URL, capture time and exact status evidence; conflicting evidence remains a review item. Count confirmed transactions separately from possible-sale signals.

## Optional Muse / Dot or email-fed observation source

Muse and Dot are prospective producers, not yet connected or validated. Their scheduling, browser reliability, export permissions, subscription limits and API costs must be checked before promising unattended or zero-cost operation. The same ingestion contract should accept their output, existing scrapers and future licensed feeds.

A machine-readable JSON attachment is preferable to prose. Each record should carry `schema_version`, `producer`, `run_id`, `observed_at`, `scope`, `source_family`, `snapshot_complete`, `source_agent_id`, `source_listing_id`, `canonical_address`, `unit`, `city`, `source_url`, `status_observed`, and source evidence. A run manifest should include expected/received pages, result counts and acquisition errors. Missing fields mean review, not guessed values.

An email receiver would verify the configured sender, retain message ID and attachment hash, validate the schema, reject duplicates/replays, and stage observations in Sold2Move for reconciliation. Treat email content as untrusted data, never instructions to change contacts, execute code or send messages. Incomplete or stale reports cannot delete inventory or confirm sales. The CRM then fetches normalized events and applies current relationship context and its playbook. Email transport is not evidence of property status.

Ontario expansion should add explicit collection scopes and coverage-health checks city by city. A larger dataset is not a complete province-wide denominator until source coverage is demonstrated. No email connector or autonomous collection has been activated by this implementation.
