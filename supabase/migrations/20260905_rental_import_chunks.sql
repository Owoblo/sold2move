CREATE TABLE IF NOT EXISTS rental_import_chunks (
  import_id uuid NOT NULL,
  part integer NOT NULL,
  sql_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (import_id, part)
);
ALTER TABLE rental_import_chunks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE rental_import_chunks IS 'Private, short-lived transport for atomic rental imports exceeding the Management API request limit; deleted on completion.';
