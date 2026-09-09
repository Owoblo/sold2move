-- Durable, private print handoff ledger. Generated market batches already reserve addresses.
CREATE TABLE IF NOT EXISTS public.market_print_dispatches (
  lane text NOT NULL CHECK (lane IN ('rental', 'commercial')),
  batch_id text NOT NULL,
  recipient text NOT NULL,
  payload_sha256 text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  provider_id text,
  PRIMARY KEY (lane, batch_id)
);
ALTER TABLE public.market_print_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_print_dispatches FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_market_print_dispatch(p_lane text, p_batch_id text, p_recipient text, p_hash text, p_recipients jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE saved jsonb; reserved integer; dispatch public.market_print_dispatches;
BEGIN
  IF p_lane NOT IN ('rental','commercial') OR p_recipient <> 'loonieprints@gmail.com' OR p_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid print claim';
  END IF;
  EXECUTE format('SELECT manifest FROM %I WHERE batch_id=$1 FOR UPDATE', p_lane || '_postcard_batches') INTO saved USING p_batch_id;
  IF saved IS NULL OR saved->'recipients' IS DISTINCT FROM p_recipients OR jsonb_array_length(p_recipients)=0 THEN
    RAISE EXCEPTION 'Print recipients do not match a saved nonempty batch';
  END IF;
  EXECUTE format('SELECT count(*) FROM %I WHERE batch_id=$1',p_lane || '_postcard_recipients') INTO reserved USING p_batch_id;
  IF reserved <> jsonb_array_length(p_recipients) THEN RAISE EXCEPTION 'Print batch address reservations missing'; END IF;
  INSERT INTO public.market_print_dispatches(lane,batch_id,recipient,payload_sha256)
    VALUES(p_lane,p_batch_id,p_recipient,p_hash) ON CONFLICT DO NOTHING;
  SELECT * INTO dispatch FROM public.market_print_dispatches WHERE lane=p_lane AND batch_id=p_batch_id FOR UPDATE;
  IF dispatch.submitted_at IS NOT NULL THEN RETURN to_jsonb(dispatch); END IF;
  IF dispatch.payload_sha256 <> p_hash OR dispatch.recipient <> p_recipient THEN RAISE EXCEPTION 'Pending print payload changed; review original request'; END IF;
  IF dispatch.started_at < now() - interval '23 hours' THEN RAISE EXCEPTION 'Unresolved print request older than 23 hours; check provider receipt before retry'; END IF;
  RETURN to_jsonb(dispatch);
END $$;

CREATE OR REPLACE FUNCTION public.submit_market_print_dispatch(p_lane text,p_batch_id text,p_hash text,p_provider_id text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE dispatch public.market_print_dispatches;
BEGIN
  IF p_lane NOT IN ('rental','commercial') OR coalesce(p_provider_id,'')='' THEN RAISE EXCEPTION 'Invalid print receipt'; END IF;
  UPDATE public.market_print_dispatches SET submitted_at=coalesce(submitted_at,now()),provider_id=p_provider_id
    WHERE lane=p_lane AND batch_id=p_batch_id AND payload_sha256=p_hash AND (provider_id IS NULL OR provider_id=p_provider_id)
    RETURNING * INTO dispatch;
  IF dispatch IS NULL THEN RAISE EXCEPTION 'Print receipt does not match claim'; END IF;
  EXECUTE format('UPDATE %I SET manifest = manifest || $2 WHERE batch_id=$1',p_lane || '_postcard_batches')
    USING p_batch_id,jsonb_build_object('delivery_status','submitted','print_recipient',dispatch.recipient,'print_provider_id',p_provider_id,'submitted_at',dispatch.submitted_at);
  RETURN to_jsonb(dispatch);
END $$;
REVOKE ALL ON FUNCTION public.claim_market_print_dispatch(text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.submit_market_print_dispatch(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_market_print_dispatch(text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_market_print_dispatch(text,text,text,text) TO service_role;
