-- Exercise the deployed transaction, then roll back every test observation.
BEGIN;
DO $$
DECLARE
  result jsonb;
  initial_baseline boolean;
  before_count bigint;
  first_at timestamptz := '2026-09-23T01:00:00Z';
BEGIN
  SELECT count(*) INTO before_count FROM public.gta_collection_inventory;
  SELECT NOT EXISTS(SELECT 1 FROM public.gta_collection_runs) INTO initial_baseline;
  result := public.ingest_gta_collection('gta-test-first', first_at,
    '[{"zpid":"999999999999999991","state":"ON","municipality":"Toronto","price":500000}]', '{}');
  IF (result->>'inserted')::int <> 1 OR (result->>'baseline')::boolean <> initial_baseline THEN
    RAISE EXCEPTION 'First observation/baseline failed';
  END IF;
  result := public.ingest_gta_collection('gta-test-first', first_at, '[]', '{}');
  IF (result->>'observed')::int <> 1 THEN RAISE EXCEPTION 'Idempotent retry failed'; END IF;
  result := public.ingest_gta_collection('gta-test-second', first_at + interval '7 days',
    '[{"zpid":"999999999999999991","state":"ON","municipality":"Toronto","price":490000},
      {"zpid":"999999999999999992","state":"ON","municipality":"Milton","price":600000}]', '{}');
  IF (result->>'inserted')::int <> 1 OR (result->>'baseline')::boolean THEN
    RAISE EXCEPTION 'Repeat collection failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gta_collection_inventory
    WHERE zpid = '999999999999999991' AND first_seen_at = first_at
      AND last_seen_at = first_at + interval '7 days' AND baseline = initial_baseline
      AND data->>'price' = '490000') THEN
    RAISE EXCEPTION 'First-seen date or baseline was overwritten';
  END IF;
  BEGIN
    PERFORM public.ingest_gta_collection('gta-test-empty', now(), '[]', '{}');
    RAISE EXCEPTION 'Empty inventory unexpectedly accepted' USING ERRCODE = 'ZX001';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
  IF (SELECT count(*) FROM public.gta_collection_inventory) <> before_count + 2 THEN
    RAISE EXCEPTION 'Unexpected inventory change';
  END IF;
  IF has_function_privilege('anon', 'public.ingest_gta_collection(text,timestamptz,jsonb,jsonb)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.ingest_gta_collection(text,timestamptz,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Ingestion must be service-only';
  END IF;
END;
$$;
ROLLBACK;
