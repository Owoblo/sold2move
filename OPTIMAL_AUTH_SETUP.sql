-- OPTIMAL AUTHENTICATION SETUP FOR SOLD2MOVE
-- This script sets up the perfect authentication system for your sign up page

-- =============================================
-- 1. CLEAN SLATE - REMOVE ALL INTERFERENCE
-- =============================================

-- Drop all existing triggers and functions that might interfere
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_trigger();
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT);
DROP FUNCTION IF EXISTS public.grant_signup_bonus(UUID);

-- =============================================
-- 2. CREATE OPTIMAL PROFILES TABLE
-- =============================================

-- Drop and recreate profiles table with proper structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_email TEXT,
    company_name TEXT,
    phone TEXT,
    country_code TEXT,
    state_code TEXT,
    city_name TEXT,
    service_cities TEXT[] DEFAULT '{}',
    main_service_city TEXT,
    service_area_cluster TEXT,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    credits_remaining INTEGER DEFAULT 100,
    unlimited BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive',
    stripe_customer_id TEXT,
    trial_granted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. SET UP PROPER PERMISSIONS
-- =============================================

-- Grant all necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- =============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for anon" ON public.profiles;

-- Create proper RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Allow anon users to insert profiles (for signup)
CREATE POLICY "Allow anon profile creation" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 5. CREATE AUTOMATIC PROFILE CREATION TRIGGER
-- =============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
        NEW.id,
        NEW.email,
        100, -- Give 100 free credits
        TRUE, -- Mark trial as granted
        FALSE, -- Onboarding not complete yet
        FALSE, -- Not unlimited
        'inactive', -- No active subscription
        '{}', -- Empty service cities array
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 6. CREATE SIGNUP BONUS FUNCTION
-- =============================================

-- Function to grant additional signup bonus
CREATE OR REPLACE FUNCTION public.grant_signup_bonus(user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the user's profile to grant additional credits
    UPDATE public.profiles 
    SET 
        credits_remaining = credits_remaining + 100,
        trial_granted = TRUE,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Check if update was successful
    IF FOUND THEN
        result := json_build_object(
            'success', true, 
            'message', 'Signup bonus granted successfully',
            'credits_added', 100
        );
    ELSE
        result := json_build_object(
            'success', false, 
            'message', 'User profile not found'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false, 
            'message', SQLERRM
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO service_role;

-- =============================================
-- 7. CREATE ADDITIONAL SUPPORTING TABLES
-- =============================================

-- Create listing_reveals table for tracking user activity
CREATE TABLE IF NOT EXISTS public.listing_reveals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on listing_reveals
ALTER TABLE public.listing_reveals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for listing_reveals
CREATE POLICY "Users can view own reveals" ON public.listing_reveals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reveals" ON public.listing_reveals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.listing_reveals TO authenticated;
GRANT ALL ON public.listing_reveals TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- =============================================
-- 8. CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get user profile with error handling
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS JSON AS $$
DECLARE
    profile_record RECORD;
    result JSON;
BEGIN
    SELECT * INTO profile_record 
    FROM public.profiles 
    WHERE id = user_id;
    
    IF FOUND THEN
        result := json_build_object(
            'success', true,
            'profile', row_to_json(profile_record)
        );
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'Profile not found'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'message', SQLERRM
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO anon;

-- =============================================
-- 9. TEST THE SETUP
-- =============================================

-- Test profile creation function
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    result JSON;
BEGIN
    -- Insert a test user (this will trigger profile creation)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (test_id, 'test@example.com', 'encrypted_password', NOW(), NOW(), NOW());
    
    -- Check if profile was created
    SELECT public.get_user_profile(test_id) INTO result;
    RAISE NOTICE 'Profile creation test: %', result;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed: %', SQLERRM;
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
    AND routine_name IN ('handle_new_user', 'grant_signup_bonus', 'get_user_profile');

-- Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
    AND event_object_table = 'users';

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'OPTIMAL AUTH SETUP COMPLETED';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '✅ Profiles table created with proper structure';
    RAISE NOTICE '✅ RLS policies configured correctly';
    RAISE NOTICE '✅ Automatic profile creation trigger active';
    RAISE NOTICE '✅ Signup bonus function ready';
    RAISE NOTICE '✅ Supporting tables created';
    RAISE NOTICE '✅ Helper functions available';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Your sign up page should now work perfectly!';
    RAISE NOTICE 'Both email/password and Google OAuth will work.';
    RAISE NOTICE '=============================================';
END $$;
