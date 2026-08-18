ALTER TABLE rental_source_records
  ADD COLUMN IF NOT EXISTS occupancy_state text,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric,
  ADD COLUMN IF NOT EXISTS classification_evidence text[],
  ADD COLUMN IF NOT EXISTS classification_method text,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;

ALTER TABLE commercial_source_records
  ADD COLUMN IF NOT EXISTS occupancy_state text,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric,
  ADD COLUMN IF NOT EXISTS classification_evidence text[],
  ADD COLUMN IF NOT EXISTS classification_method text,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;
