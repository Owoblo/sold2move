ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_representatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS listing_agent_names text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS listing_mls_id text,
  ADD COLUMN IF NOT EXISTS listing_attribution_source text,
  ADD COLUMN IF NOT EXISTS listing_attribution_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_attribution_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_attribution_attempts integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.listings.listing_representatives IS
  'Primary and co-listing representatives captured while a listing is active. Preserved after sale.';
COMMENT ON COLUMN public.listings.listing_agent_names IS
  'Convenience array of every listing representative name, primary first.';
COMMENT ON COLUMN public.listings.listing_mls_id IS
  'MLS identifier captured with active listing attribution.';
