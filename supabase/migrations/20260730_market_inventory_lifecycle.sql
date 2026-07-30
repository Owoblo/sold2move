ALTER TABLE rental_source_records
  ADD COLUMN IF NOT EXISTS missing_run_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE commercial_source_records
  ADD COLUMN IF NOT EXISTS missing_run_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS market_inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane TEXT NOT NULL CHECK (lane IN ('rental', 'commercial')),
  run_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  city TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (lane, event_key)
);

CREATE INDEX IF NOT EXISTS idx_market_inventory_events_lane_observed
  ON market_inventory_events (lane, observed_at DESC);
