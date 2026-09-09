# Postcard assessments and partnership listing activity

Live CRM: https://go.quote2move.com/marketing/listing-activity

## Operating behavior

Residential keeps the weekly cadence, seven-day default window, and existing first-disappearance sold policy. Inferred sale signals are labelled as inferred. Rental runs automatically Tuesdays at 16:30 UTC; commercial runs Wednesdays at 16:30 UTC. Each runs every seven days through acquisition, lifecycle tracking, occupancy screening, duplicate-protected batch generation, advisory assessment, partnership sync, owner email and acquisition-cost reporting. Existing market-specific qualification remains in force: a disappeared rental or commercial listing does not by itself prove a move. Shared contact research runs Thursdays at 21:30 UTC, capped at ten lookups across all lanes.

Every assessment compares the last two available runs for the same lane and region. It records changed settings, volumes, overlap, repeated statuses, price changes, available posting-age data, exclusion reasons, and source health. Comparisons across changed settings are descriptive, not claims of improved effectiveness. Unknown historical denominators are not treated as zero. Acquisition coverage is not total market coverage.

The assessment is advisory and cannot change qualification. Database or assessment failures are saved in diagnostic artifacts. Reports accompany the owner report and are also visible in the CRM. Artifacts include hidden batch files and are retained for 90 days for residential, rental and commercial workflows. Rental and commercial owner emails attach the final assessment, including diagnostic files when available. Their generated batches remain reserved for owner review under the existing 180-day duplicate guard; their workflows do not automatically dispatch to a print shop or send realtor outreach.

Successful Resend acceptance of the printer request records `submitted`, its provider receipt, and recipient. It reserves the property/postcard type against repeated automatic printing. Generating files alone is not recorded as physical mailing. PDF and CSV hashes bind the print request to its generated batch. Atomic database claims and stable Resend idempotency keys cover retries. Unresolved print attempts older than 23 hours require receipt review before retrying because provider idempotency has a finite window. Do not release a reservation without checking whether its request was accepted.

One property gets one piece within a batch, with sold taking precedence when both statuses qualify. A later distinct sold follow-up remains possible under the existing qualification rules. Physical-mail confirmation is separate and does not increment lifecycle counts twice. Historical duplicate dispatches remain in batch history; lifecycle counts track distinct postcard types.

## Partnership activity

Listing data can link many people to many properties. Source-derived names, contact details, and roles are preserved. Exact name plus matching phone/email or brokerage can link to a single CRM contact; ambiguous matches remain for review. Existing contacts' relationship state, contact restrictions, and sequences are not changed. Source-backed new contacts are created at `target` with their sequence paused. No outreach is sent by discovery.

Web research runs separately using OpenAI Responses web search, capped at ten property lookups weekly, at most two tool calls per lookup, with output and retry limits. The budget is shared across residential, rental, and commercial; newest queued jobs are prioritized. Results must reference a returned source and include property/role evidence. They remain review-only until an operator links or creates a contact. No buying-agent role is inferred from an address alone. Research limitations and remaining backlog are visible.

Official web-search reference: https://developers.openai.com/api/docs/guides/tools-web-search

## Operations and verification

- `node scripts/test-pipeline-review.cjs`
- Existing postcard, attribution, rental, commercial, and cost-report tests.
- `Pipeline Intelligence Maintenance` applies the schema and processes research. Dispatch `schema_only=true` to apply the schema without paid research.
- Required automation secret: `SUPABASE_SERVICE_ROLE_KEY`; the service role must belong to the same project as `VITE_SUPABASE_URL`. It is server-only.
- Migration: `supabase/migrations/20260909_pipeline_assessment_partnership_activity.sql`.

September 9 recovery recorded seven September 5 batches (815 pieces) based on saved artifacts and the owner's confirmation, and six September 7 batches (529 pieces) using their actual printer-email receipt IDs. Of the September 7 property/type pairs, 522 (98.7%) repeated September 5. These are confirmed duplicate print requests, not independent confirmation of physical printing or delivery. No printer email was resent during recovery.

The database holds 13 recovered residential submission batches, 1,344 batch items, and 822 unique property/type reservations. Nineteen historical assessments were imported, including rental/commercial saved review batches and older WKG history. The original checkout contains unrelated existing edits; release changes were merged onto current remote main in an isolated checkout to preserve newer market workflows.
