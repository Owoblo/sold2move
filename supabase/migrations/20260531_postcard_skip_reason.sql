-- Track why a listing was excluded from the postcard pipeline.
-- NULL means the listing has never been processed, or it successfully received a postcard.
-- Set by pipeline steps 1, 4, and 5; cleared to NULL by step 6 when a postcard is sent.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS postcard_skip_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN listings.postcard_skip_reason IS
  'Last reason the listing was excluded from a postcard run. NULL = received a postcard or not yet processed.';

CREATE INDEX IF NOT EXISTS idx_listings_postcard_skip_reason
  ON listings (postcard_skip_reason)
  WHERE postcard_skip_reason IS NOT NULL;
