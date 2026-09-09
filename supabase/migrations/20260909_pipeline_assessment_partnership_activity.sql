-- Internal observations never enqueue outreach. Access is through server APIs.
CREATE TABLE IF NOT EXISTS public.pipeline_assessments (
  run_id text PRIMARY KEY, lane text NOT NULL, region text NOT NULL,
  observed_at timestamptz NOT NULL, scope_key text NOT NULL,
  report jsonb NOT NULL, snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pipeline_assessments_history ON public.pipeline_assessments(lane,region,observed_at DESC);
CREATE TABLE IF NOT EXISTS public.partner_listing_activity (
  activity_key text PRIMARY KEY, property_key text NOT NULL, listing_id text,
  lane text NOT NULL, region text, city text, address text NOT NULL,
  listing_status text NOT NULL, status_evidence text NOT NULL,
  representative_key text NOT NULL, representative jsonb NOT NULL,
  contact_id uuid REFERENCES public.market_contacts(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'needs_review',
  source_url text, observed_at timestamptz NOT NULL, run_id text NOT NULL,
  postcard_batch_id text, postcard_status text,
  first_discovered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_key, lane, representative_key)
);
CREATE INDEX IF NOT EXISTS partner_listing_activity_contact ON public.partner_listing_activity(contact_id,observed_at DESC);
CREATE TABLE IF NOT EXISTS public.partner_listing_research (
  property_key text PRIMARY KEY, listing jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
  checked_at timestamptz, result jsonb, last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_listing_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_listing_research ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pipeline_assessments,public.partner_listing_activity,public.partner_listing_research TO service_role;

ALTER TABLE public.mail_batches ADD COLUMN IF NOT EXISTS print_started_at timestamptz;
ALTER TABLE public.mail_batches ADD COLUMN IF NOT EXISTS print_provider_id text;
ALTER TABLE public.mail_batches ADD COLUMN IF NOT EXISTS print_recipient text;
CREATE TABLE IF NOT EXISTS public.postcard_print_claims (
  property_key text NOT NULL, postcard_type text NOT NULL,
  batch_id text NOT NULL REFERENCES public.mail_batches(batch_id),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(property_key,postcard_type)
);
ALTER TABLE public.postcard_print_claims ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.postcard_print_claims TO service_role;

CREATE OR REPLACE FUNCTION public.stage_postcard_batch(p_batch_id text,p_region text,p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b mail_batches; item jsonb;
BEGIN
 IF coalesce(p_batch_id,'')='' OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid batch'; END IF;
 INSERT INTO mail_batches(batch_id,region,record_count) VALUES(p_batch_id,p_region,jsonb_array_length(p_items)) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM mail_batches WHERE batch_id=p_batch_id FOR UPDATE;
 IF b.region<>p_region THEN RAISE EXCEPTION 'Batch region mismatch'; END IF;
 IF b.status<>'generated' OR b.print_started_at IS NOT NULL THEN
   RETURN jsonb_build_object('batch_id',p_batch_id,'status',b.status,'record_count',b.record_count);
 END IF;
 DELETE FROM mail_batch_items WHERE batch_id=p_batch_id;
 FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  INSERT INTO mail_batch_items(batch_id,zpid,postcard_type,address_snapshot)
  VALUES(p_batch_id,(item->>'zpid')::bigint,item->>'postcard_type',item-'zpid'-'postcard_type');
 END LOOP;
 UPDATE mail_batches SET record_count=jsonb_array_length(p_items),updated_at=now() WHERE batch_id=p_batch_id;
 RETURN jsonb_build_object('batch_id',p_batch_id,'status','generated','record_count',jsonb_array_length(p_items));
END $$;

CREATE OR REPLACE FUNCTION public.claim_postcard_print_batch(p_batch_id text,p_recipient text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b mail_batches; i mail_batch_items; owner_batch text;
BEGIN
 SELECT * INTO b FROM mail_batches WHERE batch_id=p_batch_id FOR UPDATE;
 IF NOT FOUND OR b.status='cancelled' THEN RAISE EXCEPTION 'Batch unavailable'; END IF;
 IF b.status IN ('submitted','mailed') THEN RETURN jsonb_build_object('already_submitted',true,'provider_id',b.print_provider_id); END IF;
 IF b.print_started_at < now()-interval '23 hours' THEN RAISE EXCEPTION 'Unresolved print attempt: review provider receipt before retrying'; END IF;
 IF b.print_recipient IS NOT NULL AND b.print_recipient<>p_recipient THEN RAISE EXCEPTION 'Print recipient changed during retry'; END IF;
 IF b.record_count=0 THEN RAISE EXCEPTION 'Cannot print empty batch'; END IF;
 FOR i IN SELECT * FROM mail_batch_items WHERE batch_id=p_batch_id ORDER BY address_snapshot->>'property_key',postcard_type LOOP
  IF coalesce(i.address_snapshot->>'property_key','')='' THEN RAISE EXCEPTION 'Missing canonical property key'; END IF;
  INSERT INTO postcard_print_claims(property_key,postcard_type,batch_id) VALUES(i.address_snapshot->>'property_key',i.postcard_type,p_batch_id) ON CONFLICT DO NOTHING;
  SELECT batch_id INTO owner_batch FROM postcard_print_claims WHERE property_key=i.address_snapshot->>'property_key' AND postcard_type=i.postcard_type;
  IF owner_batch<>p_batch_id THEN RAISE EXCEPTION 'Property already reserved in batch %',owner_batch; END IF;
 END LOOP;
 UPDATE mail_batches SET status='approved',print_started_at=coalesce(print_started_at,now()),print_recipient=p_recipient,updated_at=now() WHERE batch_id=p_batch_id;
 RETURN jsonb_build_object('already_submitted',false);
END $$;

CREATE OR REPLACE FUNCTION public.submit_postcard_print_batch(p_batch_id text,p_provider_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b mail_batches; at_time timestamptz:=now();
BEGIN
 SELECT * INTO b FROM mail_batches WHERE batch_id=p_batch_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown batch'; END IF;
 IF b.status IN ('submitted','mailed') THEN RETURN jsonb_build_object('status',b.status); END IF;
 IF b.print_started_at IS NULL OR coalesce(p_provider_id,'')='' THEN RAISE EXCEPTION 'Printer claim and receipt required'; END IF;
 -- These send timestamps now mean dispatched to the printer, not physical mailing.
 UPDATE listings l SET
  just_listed_postcard_sent_at=CASE WHEN i.postcard_type='just_listed' THEN coalesce(l.just_listed_postcard_sent_at,at_time) ELSE l.just_listed_postcard_sent_at END,
  sold_postcard_sent_at=CASE WHEN i.postcard_type='sold' THEN coalesce(l.sold_postcard_sent_at,at_time) ELSE l.sold_postcard_sent_at END,
  last_postcard_sent_at=at_time,last_postcard_batch_id=p_batch_id,last_postcard_type_sent=i.postcard_type,
  postcard_send_count=coalesce(l.postcard_send_count,0)+1,
  status=CASE WHEN i.postcard_type='sold' AND l.status='sold' THEN 'sold_archived' WHEN i.postcard_type='just_listed' AND l.status='just_listed' THEN 'active' ELSE l.status END
 FROM mail_batch_items i WHERE i.batch_id=p_batch_id AND i.zpid=l.zpid;
 UPDATE mail_batches SET status='submitted',submitted_at=at_time,print_provider_id=p_provider_id,updated_at=at_time WHERE batch_id=p_batch_id;
 RETURN jsonb_build_object('status','submitted','record_count',b.record_count);
END $$;

-- A later physical-mail confirmation must not count the same dispatch twice.
CREATE OR REPLACE FUNCTION public.confirm_postcard_batch_mailed(p_batch_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b mail_batches; t timestamptz:=now();
BEGIN
 SELECT * INTO b FROM mail_batches WHERE batch_id=p_batch_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'submitted' THEN RAISE EXCEPTION 'Printer submission required before physical-mail confirmation'; END IF;
 INSERT INTO outreach_events(zpid,batch_id,event_type,occurred_at)
 SELECT zpid,p_batch_id,CASE WHEN postcard_type='sold' THEN 'sold_postcard_mailed' ELSE 'just_listed_postcard_mailed' END,t
 FROM mail_batch_items WHERE batch_id=p_batch_id ON CONFLICT DO NOTHING;
 UPDATE mail_batch_items SET status='mailed',mailed_at=t WHERE batch_id=p_batch_id;
 UPDATE mail_batches SET status='mailed',mailed_at=t,updated_at=t WHERE batch_id=p_batch_id;
 RETURN jsonb_build_object('status','mailed','record_count',b.record_count);
END $$;
REVOKE ALL ON FUNCTION public.claim_postcard_print_batch(text,text),public.submit_postcard_print_batch(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_postcard_print_batch(text,text),public.submit_postcard_print_batch(text,text) TO service_role;
NOTIFY pgrst,'reload schema';
ALTER TABLE public.market_contacts ADD COLUMN IF NOT EXISTS listing_discovery_key text;
CREATE UNIQUE INDEX IF NOT EXISTS market_contacts_listing_discovery_key ON public.market_contacts(listing_discovery_key) WHERE listing_discovery_key IS NOT NULL;
NOTIFY pgrst,'reload schema';
