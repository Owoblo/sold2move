# Rental current-occupant campaign

The owner confirmed on September 5, 2026 that rental postcards target the current tenant/occupant who may move out. They do not target an inferred incoming tenant or the landlord by default.

## Weekly operation

Rental inventory runs once weekly, Tuesday at 16:30 UTC, covering the six core regions (Ottawa is not included). Residential retains its Monday schedule. The workflow checks database access before acquisition. A `validate_only=true` dispatch runs tests and applies/verifies schema without scraping, AI or emails.

Zillow and RentSeeker are live sources. Historical hard-coded RentCafe datasets and Zillow detail datasets were removed from the defaults. Optional enrichment requires an observation timestamp within seven days and exact listing-ID matching; it cannot replace a current price. RentSeeker pagination must complete and supplied/source-URL municipality and province are preserved; the requested city is not substituted for missing geography. Failed sources are recorded separately and cannot establish disappearance.

Fresh Zillow details are fetched only for new/relisted unit-specific or single-home candidates, up to 150 per run. AI classifies up to 150 candidates, prioritizing new/relisted records. It separately records current occupancy and offered furnishing. Reusable classifications require the same description/photos/unit fingerprint and classifier version and must be under 30 days old. Reappearances require fresh classification. Missing/failed/low-confidence evidence stays in review.

## Rental eligibility

A postcard candidate requires:

- A newly observed rental listing or a reappearance.
- An explicit unit number or source-confirmed single-family/townhouse identity.
- Current occupied evidence at confidence >= 0.80 from the rental occupancy classifier.
- Fresh acquisition, a complete Ontario postal address, and no missing required unit.
- No shared-room, shared-kitchen or short-term-rental evidence.
- No existing rental batch reservation for the same address and unit.

Furnishings included in the lease are not occupancy evidence. An occupied rental offered unfurnished can qualify. Empty, staged and unknown occupancy do not. Student-oriented housing is not categorically excluded if it is a complete, occupied dwelling; shared-room listings remain review-only.

Source-level lifecycle still uses two successful misses for leased_or_withdrawn reporting; this is separate from the new-listing/current-occupant postcard trigger. Rental removal inference requires a complete fresh nonempty scope, with at least 80% of its previous active accepted inventory when that baseline contains 20+ records. Database inventory writes and miss counters commit as one transaction. Replaying the same saved run cannot increment the missing counter again.

## Saved artwork

`rental-postcards.cjs` reads history, builds the current-occupant review queue, generates a regional A7 envelope PDF and recipient CSV, and reserves the exact recipient list in a rental-only batch transaction. Different units at one property are independent mailing identities. These are generated batches, not claims of physical mailing. Database/history failures prevent batch authorization.

The owner report includes XLSX inventory, saved manifest, recipient CSV and rental envelope PDFs. It is sent to business@starmovers.ca for review; no new automated rental print instruction to LooniePrints was added.

`rental-artwork-reprint.yml` downloads a saved rental batch and rebuilds only its artwork. It requires no Apify/OpenAI/Supabase credentials. The recipient digest must match; altered or duplicate recipients fail validation. Replacement artwork is emailed to the owner with explicit replacement wording. This path neither starts a fresh scrape nor reserves a second batch.

## Cost and validation

Rental actor costs are reported by exact run ID, grouped by rental area and inventory/details, with known total and account billing-cycle usage. Failed charged attempts are included. Missing charges are labeled incomplete. OpenAI, printing, postage, subscription, tax and separate account storage/data-transfer costs are outside those actor totals. Rental spend is additional to residential; no $200 workflow cap is enforced.

Tests: rental normalization, market lifecycle, rental-campaign integration (mock sources/AI/database; actual PDF rendering), XLSX reporting, residential regressions and actor cost reporting. The rental test verifies unit identity, geography, full pagination, negated furnishing, vacant-versus-occupied eligibility, cache invalidation, duplicate-unit reservations, unavailable history, unchanged reprint recipients and blocked-network rendering.

Production credential repair and live workflow validation are recorded in the task report. The 80% occupancy threshold is an initial conservative operational rule, not a measured precision guarantee. The first real candidate batch remains useful for the owner's taste review.
