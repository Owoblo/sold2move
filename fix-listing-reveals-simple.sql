-- Simple fix for listing_reveals table data type mismatch
-- This will fix the issue without dropping the table

-- =============================================
-- 1. CHECK CURRENT SCHEMA
-- =============================================

-- Check what data type listing_id currently has
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_reveals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================
-- 2. FIX THE DATA TYPE
-- =============================================

-- Convert listing_id from TEXT to BIGINT
ALTER TABLE public.listing_reveals 
ALTER COLUMN listing_id TYPE BIGINT USING listing_id::BIGINT;

-- =============================================
-- 3. ENSURE UNIQUE CONSTRAINT EXISTS
-- =============================================

-- Drop existing unique constraint if it exists
ALTER TABLE public.listing_reveals 
DROP CONSTRAINT IF EXISTS unique_user_listing_reveal;

-- Add unique constraint
ALTER TABLE public.listing_reveals 
ADD CONSTRAINT unique_user_listing_reveal 
UNIQUE (user_id, listing_id);

-- =============================================
-- 4. VERIFY THE FIX
-- =============================================

-- Check the updated schema
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_reveals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test inserting a record
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
