-- Store Zillow detail-page freshness for postcard filtering/auditing.
-- Search-result daysOnZillow can be wrong; detail-page values are the source
-- used by the final just-listed freshness guard.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS search_days_on_zillow INTEGER,
  ADD COLUMN IF NOT EXISTS search_time_on_zillow TEXT,
  ADD COLUMN IF NOT EXISTS detail_days_on_zillow INTEGER,
  ADD COLUMN IF NOT EXISTS detail_time_on_zillow TEXT,
  ADD COLUMN IF NOT EXISTS zillow_date_posted TEXT,
  ADD COLUMN IF NOT EXISTS zillow_detail_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_listings_detail_days_on_zillow
  ON listings (detail_days_on_zillow)
  WHERE detail_days_on_zillow IS NOT NULL;
