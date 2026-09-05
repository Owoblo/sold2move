ALTER TABLE rental_source_records
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS single_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_occupancy text,
  ADD COLUMN IF NOT EXISTS furniture_visible boolean,
  ADD COLUMN IF NOT EXISTS classification_fingerprint text,
  ADD COLUMN IF NOT EXISTS acquisition_fresh boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observation_count integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS rental_pipeline_runs (
  run_id text PRIMARY KEY,
  completed_at timestamptz NOT NULL DEFAULT now(),
  lifecycle jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS rental_postcard_batches (
  batch_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  manifest jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS rental_postcard_recipients (
  mailing_key text PRIMARY KEY,
  batch_id text NOT NULL REFERENCES rental_postcard_batches(batch_id),
  recipient jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rental_pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_postcard_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_postcard_recipients ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE rental_postcard_recipients IS 'Reserved generated rental batches, not proof of physical printing or mailing. Reprints reuse the existing batch.';
