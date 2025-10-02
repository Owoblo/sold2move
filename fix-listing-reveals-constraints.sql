-- Fix listing_reveals table constraints and data types
-- Run this in your Supabase SQL editor

-- =============================================
-- CHECK CURRENT TABLE STRUCTURE
-- =============================================

-- Check the current structure of listing_reveals table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'listing_reveals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'listing_reveals' AND tc.table_schema = 'public';

-- =============================================
-- FIX TABLE STRUCTURE
-- =============================================

-- Ensure listing_id is TEXT type
ALTER TABLE public.listing_reveals 
ALTER COLUMN listing_id TYPE TEXT;

-- Create unique constraint on (user_id, listing_id) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'listing_reveals' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user_id_listing_id%'
    ) THEN
        ALTER TABLE public.listing_reveals 
        ADD CONSTRAINT unique_user_listing_reveal 
        UNIQUE (user_id, listing_id);
    END IF;
END $$;

-- =============================================
-- UPDATE RLS POLICIES
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
-- GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reveals TO authenticated;

-- =============================================
-- TEST THE SETUP
-- =============================================

-- Test inserting a reveal record
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    test_listing_id TEXT := 'test-listing-123';
    result TEXT;
BEGIN
    -- Try to insert a test reveal record
    BEGIN
        INSERT INTO public.listing_reveals (user_id, listing_id)
        VALUES (test_user_id, test_listing_id)
        ON CONFLICT (user_id, listing_id) DO NOTHING;
        
        result := 'SUCCESS: Insert works';
        
        -- Clean up test data
        DELETE FROM public.listing_reveals 
        WHERE user_id = test_user_id AND listing_id = test_listing_id;
        
    EXCEPTION WHEN OTHERS THEN
        result := 'ERROR: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', result;
END $$;

-- =============================================
-- VERIFY FINAL STRUCTURE
-- =============================================

-- Check final table structure
SELECT 
    'Final table structure' as check_type,
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
