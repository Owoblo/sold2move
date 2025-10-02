-- Complete Database Schema Fix for Sold2Move
-- This will fix all data type mismatches and constraints

-- =============================================
-- 1. CHECK CURRENT SCHEMA
-- =============================================

-- Check the actual data types in the database
SELECT 
    'current_listings' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'current_listings' AND column_name = 'id'
UNION ALL
SELECT 
    'just_listed' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'just_listed' AND column_name = 'id'
UNION ALL
SELECT 
    'sold_listings' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sold_listings' AND column_name = 'id'
UNION ALL
SELECT 
    'listing_reveals' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'listing_reveals' AND column_name = 'listing_id';

-- =============================================
-- 2. FIX LISTING_REVEALS TABLE
-- =============================================

-- Drop the existing table and recreate it with the correct schema
DROP TABLE IF EXISTS public.listing_reveals CASCADE;

-- Create listing_reveals table with BIGINT to match the source tables
CREATE TABLE public.listing_reveals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL, -- Changed to BIGINT to match source tables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint
ALTER TABLE public.listing_reveals 
ADD CONSTRAINT unique_user_listing_reveal 
UNIQUE (user_id, listing_id);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.listing_reveals ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. CREATE RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own listing reveals" ON public.listing_reveals;
DROP POLICY IF EXISTS "Users can insert own listing reveals" ON public.listing_reveals;
DROP POLICY IF EXISTS "Users can update own listing reveals" ON public.listing_reveals;
DROP POLICY IF EXISTS "Users can delete own listing reveals" ON public.listing_reveals;

-- Create new policies
CREATE POLICY "Users can view own listing reveals" ON public.listing_reveals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listing reveals" ON public.listing_reveals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listing reveals" ON public.listing_reveals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listing reveals" ON public.listing_reveals
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_listing_reveals_user_id ON public.listing_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_reveals_listing_id ON public.listing_reveals(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reveals_user_listing ON public.listing_reveals(user_id, listing_id);

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reveals TO authenticated;

-- =============================================
-- 7. TEST THE SETUP
-- =============================================

-- Test inserting a reveal record with BIGINT
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    test_listing_id BIGINT := 123456;
    result TEXT;
BEGIN
    -- Try to insert a test reveal record
    BEGIN
        INSERT INTO public.listing_reveals (user_id, listing_id)
        VALUES (test_user_id, test_listing_id)
        ON CONFLICT (user_id, listing_id) DO NOTHING;
        
        result := 'SUCCESS: Insert works with BIGINT';
        
        -- Clean up test data
        DELETE FROM public.listing_reveals 
        WHERE user_id = test_user_id AND listing_id = test_listing_id;
        
    EXCEPTION WHEN OTHERS THEN
        result := 'ERROR: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', result;
END $$;

-- =============================================
-- 8. VERIFY FINAL STRUCTURE
-- =============================================

-- Check final table structure
SELECT 
    'Final listing_reveals structure' as check_type,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_reveals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check final constraints
SELECT 
    'Final constraints' as check_type,
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'listing_reveals' AND tc.table_schema = 'public';
