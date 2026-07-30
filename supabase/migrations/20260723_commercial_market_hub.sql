-- Commercial/industrial inventory remains separate from residential listings
-- and rentals. A property may contain many independently marketed spaces.
CREATE TABLE IF NOT EXISTS commercial_properties (
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
  asset_types TEXT[] NOT NULL DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (address_key, city, province, country_code)
);

CREATE TABLE IF NOT EXISTS commercial_source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_property_id UUID REFERENCES commercial_properties(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  source_family TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  source_url TEXT,
  transaction_types TEXT[] NOT NULL DEFAULT '{}',
  asset_types TEXT[] NOT NULL DEFAULT '{}',
  title TEXT,
  description TEXT,
  asking_price NUMERIC(16,2),
  lease_rate NUMERIC(16,4),
  lease_rate_unit TEXT,
  space_size_sqft_min NUMERIC(16,2),
  space_size_sqft_max NUMERIC(16,2),
  brokerage_name TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  listed_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source, source_listing_id)
);

CREATE TABLE IF NOT EXISTS commercial_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_property_id UUID NOT NULL REFERENCES commercial_properties(id) ON DELETE CASCADE,
  source_record_id UUID REFERENCES commercial_source_records(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  unit_label TEXT,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('sale', 'lease', 'sale_or_lease', 'unknown')),
  asset_type TEXT NOT NULL,
  available_sqft_min NUMERIC(16,2),
  available_sqft_max NUMERIC(16,2),
  asking_price NUMERIC(16,2),
  lease_rate NUMERIC(16,4),
  lease_rate_unit TEXT,
  lease_type TEXT,
  availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'conditional', 'sold', 'leased', 'withdrawn', 'unknown')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_listing_id)
);

CREATE TABLE IF NOT EXISTS commercial_source_runs (
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
  rejected_geography INTEGER NOT NULL DEFAULT 0,
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_commercial_properties_city_active
  ON commercial_properties (city, province, active);
CREATE INDEX IF NOT EXISTS idx_commercial_properties_asset_types
  ON commercial_properties USING GIN (asset_types);
CREATE INDEX IF NOT EXISTS idx_commercial_source_transaction_types
  ON commercial_source_records USING GIN (transaction_types);
CREATE INDEX IF NOT EXISTS idx_commercial_spaces_transaction_asset
  ON commercial_spaces (transaction_type, asset_type, availability_status);
