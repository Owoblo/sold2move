ALTER TABLE rental_source_records
  ADD COLUMN IF NOT EXISTS acquisition_scope text;

ALTER TABLE commercial_source_records
  ADD COLUMN IF NOT EXISTS acquisition_scope text;

CREATE INDEX IF NOT EXISTS idx_rental_source_scope_active
  ON rental_source_records (source, acquisition_scope, active);

CREATE INDEX IF NOT EXISTS idx_commercial_source_scope_active
  ON commercial_source_records (source, acquisition_scope, active);
