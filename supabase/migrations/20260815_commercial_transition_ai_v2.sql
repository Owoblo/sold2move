ALTER TABLE commercial_source_records
  ADD COLUMN IF NOT EXISTS furniture_visible BOOLEAN,
  ADD COLUMN IF NOT EXISTS advertised_unit_visible BOOLEAN,
  ADD COLUMN IF NOT EXISTS transition_direction TEXT NOT NULL DEFAULT 'unclear',
  ADD COLUMN IF NOT EXISTS transition_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transition_cues TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS relocation_candidate_type TEXT NOT NULL DEFAULT 'market_intelligence';

ALTER TABLE commercial_source_records
  DROP CONSTRAINT IF EXISTS commercial_source_records_transition_direction_check;
ALTER TABLE commercial_source_records
  ADD CONSTRAINT commercial_source_records_transition_direction_check
    CHECK (transition_direction IN ('move_out_likely','move_in_opportunity','unclear'));

ALTER TABLE commercial_source_records
  DROP CONSTRAINT IF EXISTS commercial_source_records_relocation_candidate_type_check;
ALTER TABLE commercial_source_records
  ADD CONSTRAINT commercial_source_records_relocation_candidate_type_check
    CHECK (relocation_candidate_type IN ('outgoing_tenant','incoming_tenant_opportunity','market_intelligence'));

CREATE INDEX IF NOT EXISTS idx_commercial_transition_direction
  ON commercial_source_records (transition_direction, transition_confidence DESC)
  WHERE active;
