-- =============================================
-- COMPREHENSIVE DATABASE FIXES
-- =============================================
-- This script fixes the 406 errors and database issues

-- =============================================
-- 1. FIX LISTING_REVEALS TABLE ISSUES
-- =============================================

-- First, let's check the current state
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_reveals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Fix the listing_id data type issue (406 errors)
-- The issue is likely that listing_id is TEXT but should be BIGINT
ALTER TABLE public.listing_reveals 
ALTER COLUMN listing_id TYPE BIGINT USING listing_id::BIGINT;

-- Ensure the table has proper constraints
ALTER TABLE public.listing_reveals 
DROP CONSTRAINT IF EXISTS unique_user_listing_reveal;

ALTER TABLE public.listing_reveals 
ADD CONSTRAINT unique_user_listing_reveal 
UNIQUE (user_id, listing_id);

-- =============================================
-- 2. FIX RLS POLICIES FOR LISTING_REVEALS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reveals" ON public.listing_reveals;
DROP POLICY IF EXISTS "Users can insert their own reveals" ON public.listing_reveals;
DROP POLICY IF EXISTS "Users can update their own reveals" ON public.listing_reveals;
DROP POLICY IF EXISTS "Users can delete their own reveals" ON public.listing_reveals;

-- Create proper RLS policies
CREATE POLICY "Users can view their own reveals" ON public.listing_reveals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reveals" ON public.listing_reveals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reveals" ON public.listing_reveals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reveals" ON public.listing_reveals
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. FIX JUST_LISTED TABLE ISSUES
-- =============================================

-- Check if just_listed table exists and has proper structure
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'just_listed' AND table_schema = 'public') THEN
        RAISE NOTICE 'just_listed table does not exist, creating it...';
        
        CREATE TABLE public.just_listed (
            id BIGINT PRIMARY KEY,
            address_street TEXT,
            address_city TEXT,
            address_state TEXT,
            address_zip TEXT,
            unformatted_price BIGINT,
            beds INTEGER,
            baths INTEGER,
            area INTEGER,
            status_text TEXT,
            last_seen_at TIMESTAMP WITH TIME ZONE,
            mls_number TEXT,
            listing_agent TEXT,
            listing_office TEXT,
            agent_phone TEXT,
            agent_email TEXT,
            office_phone TEXT,
            office_email TEXT,
            website TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.just_listed ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for just_listed
        CREATE POLICY "Anyone can view just_listed" ON public.just_listed
          FOR SELECT USING (true);
          
    ELSE
        RAISE NOTICE 'just_listed table already exists';
    END IF;
END $$;

-- =============================================
-- 4. CREATE MISSING TABLES
-- =============================================

-- Create credit_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchased', 'used', 'bonus', 'refund')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 5. FIX PROFILES TABLE
-- =============================================

-- Ensure profiles table has all necessary columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;

-- =============================================
-- 6. CREATE SAVED_SEARCHES TABLE
-- =============================================

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON public.saved_searches(created_at DESC);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" ON public.saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. VERIFY FIXES
-- =============================================

-- Test the listing_reveals table
DO $$
DECLARE
    test_user_id UUID := 'a23378ec-4c6b-4e66-b049-0abcadd656c9'::UUID;
    test_listing_id BIGINT := 223604;
    result TEXT;
BEGIN
    -- Try to query the listing_reveals table
    BEGIN
        SELECT id FROM public.listing_reveals 
        WHERE user_id = test_user_id AND listing_id = test_listing_id
        LIMIT 1;
        
        result := 'SUCCESS: listing_reveals query works';
        
    EXCEPTION WHEN OTHERS THEN
        result := 'ERROR: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', result;
END $$;

-- Test the just_listed table
DO $$
DECLARE
    test_listing_id BIGINT := 223604;
    result TEXT;
BEGIN
    -- Try to query the just_listed table
    BEGIN
        SELECT id FROM public.just_listed 
        WHERE id = test_listing_id
        LIMIT 1;
        
        result := 'SUCCESS: just_listed query works';
        
    EXCEPTION WHEN OTHERS THEN
        result := 'ERROR: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', result;
END $$;

-- =============================================
-- 8. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reveals TO authenticated;
GRANT SELECT ON public.just_listed TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_transactions TO authenticated;

-- =============================================
-- 9. FINAL VERIFICATION
-- =============================================

-- Show final table structure
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('listing_reveals', 'just_listed', 'saved_searches', 'credit_transactions')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
