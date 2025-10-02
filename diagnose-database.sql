-- Database Diagnostic Script for Sold2Move
-- Run this in your Supabase SQL editor to check database setup

-- =============================================
-- CHECK PROFILES TABLE STRUCTURE
-- =============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================
-- CHECK RLS POLICIES
-- =============================================
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- =============================================
-- CHECK TABLE PERMISSIONS
-- =============================================
SELECT 
    grantee, 
    privilege_type, 
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

-- =============================================
-- CHECK IF PROFILES TABLE EXISTS
-- =============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as profiles_table_exists;

-- =============================================
-- CHECK AUTH.USERS TABLE ACCESS
-- =============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
) as auth_users_exists;

-- =============================================
-- CHECK GRANT SIGNUP BONUS FUNCTION
-- =============================================
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'grant_signup_bonus';

-- =============================================
-- TEST PROFILE INSERT (DRY RUN)
-- =============================================
-- This will show what happens when trying to insert a profile
-- Replace 'test-user-id' with a real UUID if you want to test
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    result TEXT;
BEGIN
    -- Try to insert a test profile
    BEGIN
        INSERT INTO public.profiles (
            id, 
            business_email, 
            credits_remaining, 
            trial_granted, 
            onboarding_complete,
            unlimited,
            subscription_status,
            service_cities,
            created_at, 
            updated_at
        ) VALUES (
            test_user_id, 
            'test@example.com', 
            100, 
            TRUE, 
            FALSE,
            FALSE,
            'inactive',
            '{}',
            NOW(), 
            NOW()
        );
        
        result := 'SUCCESS: Profile insert would work';
        
        -- Clean up test data
        DELETE FROM public.profiles WHERE id = test_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        result := 'ERROR: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', result;
END $$;
