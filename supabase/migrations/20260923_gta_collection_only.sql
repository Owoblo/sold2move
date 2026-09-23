-- GTA inventory remains separate from all mailing/dispatch tables while the
-- return address is undecided. Observations never imply a sale or mailing consent.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gta_collection_runs (
  run_id text PRIMARY KEY,
  collected_at timestamptz NOT NULL,
  observed integer NOT NULL,
  inserted integer NOT NULL,
  baseline boolean NOT NULL,
  report jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.gta_collection_inventory (
  zpid text PRIMARY KEY,
  municipality text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  baseline boolean NOT NULL,
  last_run_id text NOT NULL REFERENCES public.gta_collection_runs(run_id),
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS gta_collection_inventory_municipality_idx
  ON public.gta_collection_inventory(municipality);
ALTER TABLE public.gta_collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gta_collection_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gta_collection_runs, public.gta_collection_inventory FROM anon, authenticated;
GRANT SELECT ON public.gta_collection_runs, public.gta_collection_inventory TO service_role;

CREATE OR REPLACE FUNCTION public.ingest_gta_collection(
  p_run_id text, p_collected_at timestamptz, p_rows jsonb, p_report jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_baseline boolean;
  added integer;
  observed_count integer;
  prior public.gta_collection_runs%ROWTYPE;
BEGIN
  -- Serialize first-baseline detection and make a retry of a completed run safe.
  PERFORM pg_advisory_xact_lock(hashtext('gta_collection'));
  SELECT * INTO prior FROM public.gta_collection_runs WHERE run_id = p_run_id;
  IF FOUND THEN
    RETURN jsonb_build_object('run_id', prior.run_id, 'observed', prior.observed,
      'inserted', prior.inserted, 'baseline', prior.baseline);
  END IF;
  IF p_run_id IS NULL OR p_run_id = '' OR p_collected_at IS NULL
    OR p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Invalid GTA collection input';
  END IF;
  observed_count := jsonb_array_length(p_rows);
  IF observed_count = 0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rows) r
    WHERE COALESCE(r->>'zpid', '') !~ '^[0-9]+$'
      OR COALESCE(r->>'state', '') <> 'ON'
      OR COALESCE(r->>'municipality', '') = ''
  ) THEN RAISE EXCEPTION 'Empty or invalid GTA inventory'; END IF;
  SELECT NOT EXISTS(SELECT 1 FROM public.gta_collection_runs) INTO is_baseline;
  SELECT count(*) INTO added FROM jsonb_array_elements(p_rows) r
    WHERE NOT EXISTS (SELECT 1 FROM public.gta_collection_inventory i WHERE i.zpid = r->>'zpid');
  INSERT INTO public.gta_collection_runs VALUES
    (p_run_id, p_collected_at, observed_count, added, is_baseline, p_report);
  INSERT INTO public.gta_collection_inventory
    (zpid, municipality, first_seen_at, last_seen_at, baseline, last_run_id, data)
    SELECT r->>'zpid', r->>'municipality', p_collected_at, p_collected_at, is_baseline, p_run_id, r
    FROM jsonb_array_elements(p_rows) r
  ON CONFLICT (zpid) DO UPDATE SET
    municipality = EXCLUDED.municipality, last_seen_at = EXCLUDED.last_seen_at,
    last_run_id = EXCLUDED.last_run_id, data = EXCLUDED.data
    WHERE EXCLUDED.last_seen_at >= gta_collection_inventory.last_seen_at;
  RETURN jsonb_build_object('run_id', p_run_id, 'observed', observed_count,
    'inserted', added, 'baseline', is_baseline);
END;
$$;
REVOKE ALL ON FUNCTION public.ingest_gta_collection(text, timestamptz, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_gta_collection(text, timestamptz, jsonb, jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
