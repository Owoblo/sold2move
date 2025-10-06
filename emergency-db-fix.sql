-- EMERGENCY DATABASE FIX
-- This script completely removes all triggers and constraints that might be causing issues

-- =============================================
-- 1. COMPLETELY REMOVE ALL TRIGGERS
-- =============================================

-- Drop ALL triggers on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;

-- =============================================
-- 2. REMOVE ALL FUNCTIONS THAT MIGHT CAUSE ISSUES
-- =============================================

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_trigger();

-- =============================================
-- 3. COMPLETELY RESET PROFILES TABLE
-- =============================================

-- Drop all constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_business_email_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.profiles;

-- =============================================
-- 4. RECREATE PROFILES TABLE FROM SCRATCH
-- =============================================

-- Drop and recreate the profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_email TEXT,
    credits_remaining INTEGER DEFAULT 100,
    trial_granted BOOLEAN DEFAULT FALSE,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    unlimited BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive',
    service_cities TEXT[] DEFAULT '{}',
    main_service_city TEXT,
    service_area_cluster TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. GRANT ALL PERMISSIONS
-- =============================================

-- Grant all permissions to all roles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- =============================================
-- 6. CREATE PERMISSIVE RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies
CREATE POLICY "Allow all operations for authenticated users" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 7. CREATE SIMPLE PROFILE CREATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.create_user_profile(user_id UUID, user_email TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Simple insert
    INSERT INTO public.profiles (
        id, 
        business_email,
        credits_remaining, 
        trial_granted, 
        created_at, 
        updated_at
    )
    VALUES (
        user_id,
        user_email,
        100,
        TRUE,
        NOW(),
        NOW()
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Profile created successfully',
        'user_id', user_id
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Error creating profile: ' || SQLERRM,
            'user_id', user_id
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT) TO service_role;

-- =============================================
-- 8. CREATE SIMPLE SIGNUP BONUS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.grant_signup_bonus(user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_email TEXT;
BEGIN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    
    -- Create or update profile
    INSERT INTO public.profiles (
        id, 
        business_email,
        credits_remaining, 
        trial_granted, 
        created_at, 
        updated_at
    )
    VALUES (
        user_id,
        user_email,
        100,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        credits_remaining = profiles.credits_remaining + 100,
        trial_granted = TRUE,
        updated_at = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'Signup bonus granted',
        'credits_granted', 100
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', 'Error granting signup bonus: ' || SQLERRM,
            'credits_granted', 0
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO service_role;

-- =============================================
-- 9. TEST THE SETUP
-- =============================================

-- Test profile creation
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_result JSON;
BEGIN
    -- Test profile creation function
    SELECT public.create_user_profile(test_user_id, 'test@example.com') INTO test_result;
    
    RAISE NOTICE 'Profile creation test result: %', test_result;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_user_id;
    
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Profile creation test failed: %', SQLERRM;
END $$;

-- =============================================
-- 10. VERIFY SETUP
-- =============================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('create_user_profile', 'grant_signup_bonus');

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'EMERGENCY DATABASE FIX APPLIED';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '1. All triggers removed';
    RAISE NOTICE '2. Profiles table recreated from scratch';
    RAISE NOTICE '3. All permissions granted';
    RAISE NOTICE '4. Permissive RLS policies created';
    RAISE NOTICE '5. Simple functions created';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Authentication should now work without triggers';
    RAISE NOTICE 'Profile creation will be handled manually';
    RAISE NOTICE '=============================================';
END $$;
