ALTER TABLE commercial_source_records ADD COLUMN IF NOT EXISTS classification_fingerprint text,
  ADD COLUMN IF NOT EXISTS commercial_assessment jsonb,
  ADD COLUMN IF NOT EXISTS detail_fingerprint text,
  ADD COLUMN IF NOT EXISTS details_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS details_payload jsonb;
CREATE TABLE IF NOT EXISTS commercial_pipeline_runs(run_id text PRIMARY KEY,completed_at timestamptz NOT NULL DEFAULT now(),lifecycle jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS commercial_import_chunks(import_id uuid NOT NULL,part integer NOT NULL,sql_text text NOT NULL,PRIMARY KEY(import_id,part));
CREATE TABLE IF NOT EXISTS commercial_postcard_batches(batch_id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),manifest jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS commercial_postcard_recipients(mailing_key text PRIMARY KEY,batch_id text NOT NULL REFERENCES commercial_postcard_batches(batch_id),recipient jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE commercial_pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_import_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_postcard_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_postcard_recipients ENABLE ROW LEVEL SECURITY;
