-- Derived internal reports only. No outreach or contact mutations.
CREATE TABLE IF NOT EXISTS public.partner_market_coverage_snapshots (
  id text PRIMARY KEY,
  generated_at timestamptz NOT NULL,
  report jsonb NOT NULL CHECK (report->>'version' = '1'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_market_coverage_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_market_coverage_snapshots FROM anon, authenticated;
GRANT ALL ON public.partner_market_coverage_snapshots TO service_role;
CREATE INDEX IF NOT EXISTS partner_market_coverage_latest ON public.partner_market_coverage_snapshots(generated_at DESC);
NOTIFY pgrst, 'reload schema';
