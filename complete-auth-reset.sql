-- COMPLETE AUTH RESET SOLUTION
-- This script completely resets the authentication system

-- =============================================
-- 1. COMPLETELY DISABLE ALL CUSTOM AUTH INTERFERENCE
-- =============================================

-- Drop ALL custom triggers on auth tables
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;

-- Drop ALL custom functions that might interfere with auth
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_trigger();
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT);
DROP FUNCTION IF EXISTS public.grant_signup_bonus(UUID);

-- =============================================
-- 2. RESET PROFILES TABLE COMPLETELY
-- =============================================

-- Drop the entire profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate profiles table with minimal structure
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
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
-- 3. SET UP MINIMAL PERMISSIONS
-- =============================================

-- Grant basic permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- =============================================
-- 4. SET UP MINIMAL RLS
-- =============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create very simple policies
CREATE POLICY "Allow all for authenticated" ON public.profiles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for anon" ON public.profiles
    FOR ALL USING (auth.role() = 'anon');

-- =============================================
-- 5. CREATE SIMPLE MANUAL FUNCTIONS
-- =============================================

-- Simple function to create profile manually
CREATE OR REPLACE FUNCTION public.create_profile_manual(user_id UUID, user_email TEXT)
RETURNS JSON AS $$
BEGIN
    INSERT INTO public.profiles (id, business_email, credits_remaining, trial_granted)
    VALUES (user_id, user_email, 100, TRUE);
    
    RETURN json_build_object('success', true, 'message', 'Profile created');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to grant signup bonus
CREATE OR REPLACE FUNCTION public.grant_bonus_manual(user_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE public.profiles 
    SET credits_remaining = credits_remaining + 100, trial_granted = TRUE
    WHERE id = user_id;
    
    RETURN json_build_object('success', true, 'message', 'Bonus granted');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_profile_manual(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_manual(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.grant_bonus_manual(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_bonus_manual(UUID) TO anon;

-- =============================================
-- 6. TEST BASIC OPERATIONS
-- =============================================

-- Test profile creation
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result JSON;
BEGIN
    SELECT public.create_profile_manual(test_id, 'test@example.com') INTO result;
    RAISE NOTICE 'Profile creation test: %', result;
    
    DELETE FROM public.profiles WHERE id = test_id;
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Profile creation test failed: %', SQLERRM;
END $$;

-- =============================================
-- 7. VERIFY SETUP
-- =============================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check policies
SELECT 
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
    AND routine_name IN ('create_profile_manual', 'grant_bonus_manual');

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'COMPLETE AUTH RESET APPLIED';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '1. All custom auth triggers removed';
    RAISE NOTICE '2. All custom auth functions removed';
    RAISE NOTICE '3. Profiles table recreated from scratch';
    RAISE NOTICE '4. Minimal permissions and RLS set up';
    RAISE NOTICE '5. Simple manual functions created';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Authentication should now work without interference';
    RAISE NOTICE 'Profile creation will be handled manually in the app';
    RAISE NOTICE '=============================================';
END $$;
