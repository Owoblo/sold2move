-- A commercial listing is market intelligence by default. Outreach eligibility
-- requires unit-level identity, a named occupant, and explicit transition proof.
ALTER TABLE commercial_source_records
  ADD COLUMN IF NOT EXISTS listing_scope TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS unit_label TEXT,
  ADD COLUMN IF NOT EXISTS current_occupant_name TEXT,
  ADD COLUMN IF NOT EXISTS occupant_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_date TEXT,
  ADD COLUMN IF NOT EXISTS transition_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS relocation_probability INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_relocation_candidate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS relocation_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outreach_status TEXT NOT NULL DEFAULT 'market_intelligence_only';

ALTER TABLE commercial_source_records
  DROP CONSTRAINT IF EXISTS commercial_source_records_listing_scope_check;
ALTER TABLE commercial_source_records
  ADD CONSTRAINT commercial_source_records_listing_scope_check
    CHECK (listing_scope IN ('whole_building','unit','multiple_units','land','business_sale','unknown'));

ALTER TABLE commercial_source_records
  DROP CONSTRAINT IF EXISTS commercial_source_records_relocation_probability_check;
ALTER TABLE commercial_source_records
  ADD CONSTRAINT commercial_source_records_relocation_probability_check
    CHECK (relocation_probability BETWEEN 0 AND 100);

ALTER TABLE commercial_source_records
  DROP CONSTRAINT IF EXISTS commercial_source_records_outreach_status_check;
ALTER TABLE commercial_source_records
  ADD CONSTRAINT commercial_source_records_outreach_status_check
    CHECK (outreach_status IN ('market_intelligence_only','eligible_for_human_review','reviewed','rejected','approved'));

ALTER TABLE commercial_spaces
  ADD COLUMN IF NOT EXISTS availability_date TEXT,
  ADD COLUMN IF NOT EXISTS current_occupant_name TEXT,
  ADD COLUMN IF NOT EXISTS relocation_probability INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_relocation_candidate BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_commercial_direct_relocation_candidates
  ON commercial_source_records (direct_relocation_candidate, relocation_probability DESC)
  WHERE active;
CREATE INDEX IF NOT EXISTS idx_commercial_unit_identity
  ON commercial_source_records (commercial_property_id, unit_label)
  WHERE unit_label IS NOT NULL;
