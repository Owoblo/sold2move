# Playbook: Adding a New Region (e.g. Toronto)

Every region gets genuine data through the same machinery — full-inventory
scraping, two-strike sold detection, per-address send caps, and pre-mail sold
verification. Follow these steps and a new region inherits all of it.

## 1. Add the region to `scripts/postcard-region-config.cjs`

```js
toronto: {
  key: 'toronto',
  label: 'Toronto / GTA Core',
  outputPrefix: 'Toronto',
  printRecipientLabel: 'Toronto print batch',
  cities: [
    'Toronto', 'North York', 'Scarborough', 'Etobicoke', 'East York', 'York',
    // ...every city label Zillow might use inside the bounds
  ],
  bounds: { west: -79.65, east: -79.10, south: 43.55, north: 43.86 },
  gridSplit: { rows: 4, cols: 4 },   // see sizing note below
  returnAddressLines: [
    'Your Business Name',
    '123 Street Address, Unit X',
    'Toronto, ON M5V 0A1',
  ],
},
```

**Rules that keep data genuine:**

- **Every city must have exactly ONE owner region.** Never list the same city
  in two regions — listings will flip regions between runs. (The code
  preserves postcard history via first-owner-wins, but region churn still
  muddies reporting.)
- **`gridSplit` sizing:** Zillow map searches cap at ~500 results per query.
  Size the grid so each cell stays under ~400 active listings. Rule of thumb:
  - Rural/small-town region (Chatham, Woodstock): default 2×2 is fine
  - Mid-size metro (London, Ottawa): 3×3
  - Dense metro (Toronto, GTA): 4×4 or more
  If the "Got N current results" log divided by grid cell count approaches
  400-500, increase the grid.
- **Bounds:** draw them on Zillow's map view and read the lat/lng from the
  URL's `mapBounds`. Overlapping another region's bounds is tolerated (the
  code recognizes cross-region listings by zpid) but keep overlap minimal.

## 2. Add the region blocks to `.github/workflows/postcard-pipeline.yml`

Copy an existing region's three steps (Run pipeline / Find output files /
Email results) and replace the region key and output prefix. Then:

- add the key to the `regions` input default (line ~30) **and** the fallback
  in the "Resolve regions" step,
- add a `<REGION>_FOUND` env + clause to the
  "Notify when a selected region produced no postcards" step.

## 3. SEED the region before its first real run  ← do not skip

The first scrape of a new region sees the *entire existing inventory* as
"never seen before." Without seeding, every one of those (hundreds to
thousands) would be mailed a just_listed postcard.

Trigger the workflow manually (`workflow_dispatch`) with:

- **regions**: `toronto` (only the new region)
- but FIRST make the pipeline seed-aware for that run, either by running
  locally:

```bash
node scripts/postcard-pipeline.cjs --region toronto --seed --skip-photos --skip-furniture
```

or by temporarily adding `--seed` to the region's pipeline step in the
workflow for one run.

Seed mode stores everything as `active` inventory — no postcards, no photo
fetches, no furniture scans. From the next run onward:

- new listings (not in the seeded set) → `just_listed` → postcard
- seeded listings that vanish for 2 consecutive scrapes → `sold` → postcard

## 4. First-week checklist

- Run 1 (seed): expect `Lifecycle summary: 0 just_listed, ..., N seeded`.
- Run 2: just_listed counts should be small and believable (a metro sees
  dozens of new listings per 2 days, not hundreds).
- Watch for `WARNING: city name(s) from Zillow didn't match our list` —
  add those cities to the config so their listings aren't operating with a
  raw/unknown city label.
- Watch for `DEGRADED SCRAPE` warnings — means Apify returned <50% of known
  inventory; check Apify credits and actor health.
- Confirm `Sold verification` lines appear before the first sold batch
  mails.

## Built-in protections a new region inherits automatically

| Protection | What it stops |
|---|---|
| Full-inventory scrape (no `doz` filter) | listings "aging out" of a window and becoming phantom solds |
| Grid-split searches | Zillow's ~500/search cap silently truncating results |
| Degraded-scrape gate (<50% of known active) | partial Apify results burning Tier-2 miss strikes |
| Two-strike sold flip (`missing_scrape_count >= 2`) | one bad scrape creating phantom solds |
| Pre-mail sold verification (detail-page check) | mailing "sold" to delisted/expired listings still on market |
| Per-address lifetime cap (`postcard_send_count >= 2`) | any over-mailing regardless of cause |
| Address-level dedup across zpids | relists (new zpid, same house) getting duplicate mail |
| Error-payload rejection + polling caps | Apify "successful" runs full of error objects |
| Seed mode | onboarding a region mass-mailing its backlog |

## Cost model

- Scrape cost scales with **active inventory × runs/month** (full-inventory
  scraping is ~3-5× the old windowed scrape, still far cheaper than one
  phantom batch of postcards).
- Photo fetches + furniture scans only run for genuinely new `just_listed`
  rows, so steady-state cost is driven by real market turnover, not
  inventory size.
- Sold verification costs a few detail-page fetches per run (candidates are
  capped at 60).
