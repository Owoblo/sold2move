# Toronto / GTA pipeline

## Scheduled and manual runs

`GTA Collection and Existing Postcard Pipeline` runs on Mondays at 15:00 UTC.
It also supports manual dispatch. It covers the 25 GTA municipalities plus
Hamilton in `scripts/gta-coverage.cjs`.

1. Collect the full inventory once, checking municipality coverage and large
   count drops before replacing the saved snapshot.
2. Preserve the current and immutable per-run inventories in the private
   Supabase Storage bucket `gta-inventory`.
3. `gta-pipeline-bridge.cjs` adapts that census into `listings`, using the existing
   `buildLifecycleRows` function from `postcard-step0-scrape.cjs`.
4. `gta-existing-pipeline.cjs` runs the existing regional pipeline with
   `--region toronto --skip-scrape`. It uses the same filtering, photo fetching,
   classification, address checks, output rules, and staging as the other regions.
   It does not run a second market scrape.
5. Qualified outputs go to the owner only. The inventory/change report is a
   separate report, not a claim that every inventory candidate is mail-ready.

The ordinary lifecycle remains in force: new IDs at new addresses enter the
just-listed path; a known address under another ID is not a new lead; first
absence enters the existing inferred-sold path. Inferred sold can include
withdrawn listings and is not independent confirmation of a sale. Existing
freshness and quality filters still apply. Mailing history allows the separate
just-listed and sold events and prevents duplicate events and excess sends.

## September baseline and protection of existing regions

The immutable September 23 census is `runs/github-35897202958-1/inventory.json`:
25,520 observed properties. `latest.json` preserves the cumulative inventory.
Each subsequent run also retains its report and observation differences.

The September baseline was connected as **existing active inventory**, creating
no new-listing or sold events: 25,496 GTA-owned records, with 24 records already
owned by other regions excluded from GTA mutations. Legacy `Ontario, Canada`
records that belong to this census retain their mailing history while being
assigned to the GTA pipeline. Other regional ownership is protected.

`pipeline/state.json` records the applied snapshot. Before any listing write,
the bridge saves the old records and inserted IDs under `pipeline/backups/`.
Updates omit all mailing-history columns and verify preserved values afterward.
The original storage snapshots are not rewritten by baseline connection.

A missing or unreadable baseline stops processing. Failed writes do not advance
the applied-state marker. Replaying the baseline is tested to produce no new
lifecycle events. `GTA Existing Pipeline Connection` supports read-only checks;
its `check_only` input never seeds or processes mail.

## Qualification recovery

The August comparison is separate from the normal scheduled lifecycle. August
contained a qualified audience, not a full market census. The full September
recovery uses the original August photo prompt and export criteria: furnished,
ordinary homeowner resale, homeowner outreach, confidence at least 0.9, plus
its original deterministic checks.

Of 24,013 submitted September classifications, 20,275 returned parsed results;
3,738 remained unresolved. The complete historical comparison is therefore
held, not presented as finished. Recovered classification evidence is stored
privately and imported into baseline records; missing evidence remains subject
to the normal pipeline's qualification/retry rules. The earlier 125-envelope
review was an age-limited, explicit-sale-only subset and is not the complete
August/September comparison or a batch that was sent.

## Owner delivery and envelope format

GTA output and replacement artwork are restricted to `business@starmovers.ca`.
The email transport rejects other recipients, including Loonie Prints.
Owner delivery does not claim printer submission or mark records mailed.
Actual mailing is recorded through the existing confirmation process.

Envelopes use the existing front-only A7 layout, 522 × 378 points, with this
return address for all GTA municipalities and Hamilton:

    SSM | Saturn Star Movers
    426-2285 The Collegeway
    Mississauga, ON L5L 2M3

There is no back page or property-management name.

## Retained evidence

GitHub artifacts retain raw observations, municipality counts, unmapped labels,
change reports, generated outputs, and pipeline audit files for 90 days. Private
Supabase storage retains successful inventory snapshots and connection backups.
Ambiguous source labels remain reported instead of being assigned arbitrarily.

Activation was checked using the live saved baseline, database read-back,
normal pipeline reads, same-snapshot replay, simulated new/missing events,
and the existing regional lifecycle regression suite. No paid scrape or mailing
is part of the read-only connection checks.
