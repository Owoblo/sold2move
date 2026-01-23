-- Migration: Add fixed-tier subscription system fields
-- Date: 2026-01-22
-- Description: Add columns to profiles table for the new 3-tier subscription system
--              (Solo $99, Special $249, Premium $999)

-- Add subscription tier fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS subscription_tier_name TEXT,
ADD COLUMN IF NOT EXISTS city_limit INTEGER,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pending_subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS pending_subscription_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_checkout_created_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_tier IS 'Current subscription tier ID: solo, special, or premium';
COMMENT ON COLUMN profiles.subscription_tier_name IS 'Display name for the subscription tier';
COMMENT ON COLUMN profiles.city_limit IS 'Number of cities allowed (NULL = unlimited for premium)';
COMMENT ON COLUMN profiles.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN profiles.pending_subscription_tier IS 'Tier selected but not yet paid';
COMMENT ON COLUMN profiles.pending_subscription_price IS 'Price for pending subscription';
COMMENT ON COLUMN profiles.subscription_checkout_created_at IS 'When checkout was initiated';

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Create subscription_tiers reference table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  city_limit INTEGER, -- NULL means unlimited
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the three tiers
INSERT INTO subscription_tiers (id, name, price, city_limit, features, sort_order) VALUES
  ('solo', 'Solo', 99.00, 1, '["listings_access", "basic_export", "email_support"]'::jsonb, 1),
  ('special', 'Movers Special', 249.00, 2, '["listings_access", "basic_export", "email_support", "homeowner_lookup", "furniture_detection", "intent_signals", "crm_integration"]'::jsonb, 2),
  ('premium', 'Premium', 999.00, NULL, '["listings_access", "basic_export", "email_support", "homeowner_lookup", "furniture_detection", "intent_signals", "crm_integration", "chain_detection", "priority_support", "team_seats", "custom_integrations", "mailing_discounts"]'::jsonb, 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  city_limit = EXCLUDED.city_limit,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Create user_cities table to track which cities each user has access to
CREATE TABLE IF NOT EXISTS user_cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  state_code TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, city_name, state_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_cities_user_id ON user_cities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cities_city ON user_cities(city_name, state_code);

-- RLS policies for user_cities
ALTER TABLE user_cities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cities
CREATE POLICY "Users can view own cities" ON user_cities
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own cities
CREATE POLICY "Users can add own cities" ON user_cities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cities
CREATE POLICY "Users can remove own cities" ON user_cities
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for subscription_tiers (public read)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription tiers" ON subscription_tiers
  FOR SELECT USING (is_active = true);
