ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_attribution_status text,
  ADD COLUMN IF NOT EXISTS listing_attribution_confidence integer,
  ADD COLUMN IF NOT EXISTS listing_attribution_sources jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.listings.listing_attribution_status IS
  'Deterministic validation result: verified, high_confidence, or unresolved.';
COMMENT ON COLUMN public.listings.listing_attribution_confidence IS
  'Application-calculated evidence score from 0 to 100; never model self-reported.';
COMMENT ON COLUMN public.listings.listing_attribution_sources IS
  'Normalized public source URLs and exact-property evidence used for attribution.';
