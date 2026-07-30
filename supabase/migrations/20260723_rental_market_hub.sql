-- Source-neutral rental inventory. A canonical property may be advertised by
-- many marketplaces; source records preserve every sighting and its raw data.
CREATE TABLE IF NOT EXISTS rental_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_address TEXT NOT NULL,
  address_key TEXT NOT NULL,
  street_address TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL DEFAULT 'ON',
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'CA',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  property_type TEXT,
  entity_type TEXT NOT NULL DEFAULT 'property'
    CHECK (entity_type IN ('property', 'building', 'unit', 'room', 'facility')),
  listing_categories TEXT[] NOT NULL DEFAULT '{}',
  occupancy_states TEXT[] NOT NULL DEFAULT '{}',
  property_signals TEXT[] NOT NULL DEFAULT '{}',
  classification_confidence NUMERIC(4,3),
  classification_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  classified_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  availability_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability_status IN ('available', 'pending', 'leased', 'withdrawn', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (address_key, city, province, country_code)
);

CREATE TABLE IF NOT EXISTS rental_source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_property_id UUID REFERENCES rental_properties(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  source_family TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  source_url TEXT,
  source_address TEXT,
  unit_label TEXT,
  monthly_price NUMERIC(12,2),
  bedrooms NUMERIC(5,2),
  bathrooms NUMERIC(5,2),
  description TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  contact_name TEXT,
  contact_role TEXT,
  contact_company TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  online_leasing_url TEXT,
  units_available INTEGER,
  available_at DATE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source, source_listing_id)
);

CREATE TABLE IF NOT EXISTS rental_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
  source_record_id UUID REFERENCES rental_source_records(id) ON DELETE SET NULL,
  source TEXT,
  source_listing_id TEXT,
  unit_label TEXT,
  floorplan_name TEXT,
  bedrooms NUMERIC(5,2),
  bathrooms NUMERIC(5,2),
  square_feet_min INTEGER,
  square_feet_max INTEGER,
  monthly_price_min NUMERIC(12,2),
  monthly_price_max NUMERIC(12,2),
  available_units INTEGER,
  available_at DATE,
  availability_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability_status IN ('available', 'pending', 'leased', 'withdrawn', 'unknown')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE rental_source_records
  ADD COLUMN IF NOT EXISTS online_leasing_url TEXT,
  ADD COLUMN IF NOT EXISTS units_available INTEGER;

ALTER TABLE rental_units
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_listing_id TEXT;

CREATE TABLE IF NOT EXISTS rental_source_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_family TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL DEFAULT 'ON',
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  records_seen INTEGER NOT NULL DEFAULT 0,
  canonical_properties_seen INTEGER NOT NULL DEFAULT 0,
  incremental_properties INTEGER NOT NULL DEFAULT 0,
  rejected_geography INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12,5),
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rental_properties_city_active
  ON rental_properties (city, province, active);
CREATE INDEX IF NOT EXISTS idx_rental_properties_categories
  ON rental_properties USING GIN (listing_categories);
CREATE INDEX IF NOT EXISTS idx_rental_source_records_property
  ON rental_source_records (rental_property_id);
CREATE INDEX IF NOT EXISTS idx_rental_source_records_source_active
  ON rental_source_records (source, active);
CREATE INDEX IF NOT EXISTS idx_rental_units_property
  ON rental_units (rental_property_id);
CREATE INDEX IF NOT EXISTS idx_rental_units_availability
  ON rental_units (availability_status, available_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_units_source_floorplan
  ON rental_units (
    rental_property_id,
    COALESCE(source, ''),
    COALESCE(source_listing_id, ''),
    COALESCE(floorplan_name, ''),
    COALESCE(unit_label, '')
  );

COMMENT ON COLUMN rental_properties.listing_categories IS
  'Independent multi-label facts such as rental, student_housing, senior_housing, purpose_built_rental, furnished, new_construction';
COMMENT ON COLUMN rental_source_records.source_family IS
  'Syndication family used to avoid overstating coverage from sister marketplaces';
