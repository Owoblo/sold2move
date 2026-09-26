-- Supports bounded residential lifecycle reads, especially Ottawa's larger
-- inventory. Keeping zpid last also supports the stable per-status ordering.
CREATE INDEX IF NOT EXISTS idx_listings_region_status_zpid
  ON listings (region, status, zpid);
