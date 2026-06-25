-- Postcard send guardrails (Tier 1 + Tier 2).
-- Run this once in the Supabase SQL editor against the production project.

-- ─── Tier 1: hard cap total postcards per address ──────────────────────────
-- Even if status flaps (just_listed -> sold -> just_listed -> sold), a given
-- zpid will never receive more than MAX_SENDS (2) postcards lifetime.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS postcard_send_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing timestamps so rows that already received a postcard
-- start at the right count, not 0.
UPDATE listings
SET postcard_send_count =
      (CASE WHEN just_listed_postcard_sent_at IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN sold_postcard_sent_at        IS NOT NULL THEN 1 ELSE 0 END)
WHERE postcard_send_count = 0
  AND (just_listed_postcard_sent_at IS NOT NULL
       OR sold_postcard_sent_at        IS NOT NULL);

-- ─── Tier 2: don't believe "sold" until missing from N consecutive scrapes ─
-- A listing that's in our DB as active/just_listed but doesn't appear in the
-- current scrape gets its missing_scrape_count incremented. Only after it's
-- missing across N=2 consecutive scrapes (≈4-6 days at our cron cadence)
-- does it actually flip to status='sold' and become eligible for a sold
-- postcard. Reappearance resets the counter to 0.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS missing_scrape_count INTEGER NOT NULL DEFAULT 0;
