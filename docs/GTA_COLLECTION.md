# Toronto / GTA collection

The `GTA Inventory Collection — Printing Held` workflow collects fresh inventory
on Mondays at 15:00 UTC and supports manual dispatch. Coverage is the 25 GTA
municipalities plus Hamilton defined in `scripts/gta-coverage.cjs`.

Inventory and quality reports are stored in the private Supabase Storage bucket
`gta-inventory`. Each run has an immutable `runs/<run-id>/inventory.json` and
`report.json`; `latest.json` holds the latest cumulative inventory. The first
successful run is the baseline. Updates preserve each property's first observation and baseline
flag. Later observations are not automatically called newly listed or sold.
Missing listings are never deleted or marked sold by this collector.
Each later collection also stores `runs/<run-id>/changes.json`, comparing the
previous observation with the current one by listing ID and street/municipality.
It separates new candidates, disappeared candidates, and changed IDs at the same
address. Listing dates and sold status still require verification before mailing.

The collection workflow emails inventory/change reports to the owner only.
Those reports explicitly state zero qualified envelopes; sample proofs are not
attached as production batches. No postcard generation, print dispatch or
mailing step is present in the collection workflow.
This private bucket is separate from the existing postcard inventory.
The shared return address is confirmed in `scripts/postcard-region-config.cjs`
under `toronto` (also accepted as `gta`):

    SSM | Saturn Star Movers
    426-2285 The Collegeway
    Mississauga, ON L5L 2M3

The address applies to all covered GTA municipalities and Hamilton. No property
management name is included. Enabling printing requires an explicit
connection to the postcard pipeline and revalidation of
listing eligibility; old baseline inventory must not become new-listing leads.

GTA batches and replacement artwork are restricted to `business@starmovers.ca`.
The email transport rejects any other recipient for `toronto`/`gta`. Delivering
an owner-review batch does not claim printer submission or mark listings mailed.
The envelope format is front-only A7, 522 × 378 points, with the existing
paper-stock layout and return address under the wordmark. There is no back page.

Every collection checks for missing municipalities and major inventory drops
before replacing the previous snapshot. An incomplete collection fails visibly
and retains its reports while preserving the earlier comparison baseline.

`GTA Historical Inventory Comparison` reads the existing residential listing
tables and compares their GTA records with the latest private inventory. Its
artifact includes per-table dates/status counts, missing candidates, and newly
observed candidates. A database record's absence alone does not prove a sale;
different source dates or partial historical coverage can affect comparisons.

Each run retains raw observations, a CSV, municipality counts, unmapped labels,
and a persistence summary as a GitHub artifact for 90 days. Private Supabase
storage retains every successful inventory snapshot without an expiration.
Ambiguous labels (including
Thornhill, shared by Markham and Vaughan) remain in the review report rather
than being assigned arbitrarily. Zero-result municipalities are reported.
