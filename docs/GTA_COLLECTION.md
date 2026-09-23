# Toronto / GTA collection

The `GTA Inventory Collection — Printing Held` workflow collects fresh inventory
on Mondays at 15:00 UTC and supports manual dispatch. Coverage is the 25 GTA
municipalities plus Hamilton defined in `scripts/gta-market-census.cjs`.

Inventory is stored in `gta_collection_inventory`; successful run summaries and
quality reports are stored in `gta_collection_runs`. The first successful run is
the baseline. Upserts preserve each property's first observation and baseline
flag. Later observations are not automatically called newly listed or sold.
Missing listings are never deleted or marked sold by this collector.

No postcard generation, print dispatch, mailing or email steps are present.
These service-only tables are separate from the existing postcard inventory.
The return address remains unset. Enabling printing later requires an explicit
connection to the postcard pipeline, a confirmed address, and revalidation of
listing eligibility; old baseline inventory must not become new-listing leads.

Each run retains raw observations, a CSV, municipality counts, unmapped labels,
and a persistence summary as a GitHub artifact for 90 days. The database retains
the latest observation and first-seen dates. Ambiguous labels (including
Thornhill, shared by Markham and Vaughan) remain in the review report rather
than being assigned arbitrarily. Zero-result municipalities are reported.
