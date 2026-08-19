CREATE TABLE IF NOT EXISTS public.market_mail_batches (
  batch_id TEXT PRIMARY KEY,
  lane TEXT NOT NULL CHECK (lane IN ('rental','commercial')),
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','mailed','cancelled')),
  record_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mailed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.market_mail_items (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES public.market_mail_batches(batch_id) ON DELETE CASCADE,
  lane TEXT NOT NULL CHECK (lane IN ('rental','commercial')),
  entity_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT,
  source_listing_id TEXT,
  address_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','mailed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mailed_at TIMESTAMPTZ,
  UNIQUE (batch_id, entity_key, event_type)
);

CREATE INDEX IF NOT EXISTS idx_market_mail_suppression
  ON public.market_mail_items(lane, entity_key, event_type, created_at DESC)
  WHERE status IN ('generated','mailed');

ALTER TABLE public.market_mail_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_mail_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.market_mail_items IS
  'Generated/mailed rental and commercial direct-mail ledger. Rental turnover is suppressed for 120 days; commercial occupant move-out for 365 days.';
