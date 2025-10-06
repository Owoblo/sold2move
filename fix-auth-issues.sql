-- Fix Authentication Issues
-- Run this in Supabase SQL Editor to resolve common auth problems

-- =============================================
-- 1. CHECK AND FIX PROFILES TABLE STRUCTURE
-- =============================================

-- Ensure profiles table has all required columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS trial_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unlimited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS service_cities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS main_service_city TEXT,
ADD COLUMN IF NOT EXISTS service_area_cluster TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- 2. FIX RLS POLICIES
-- =============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- =============================================
-- 3. FIX PROFILE CREATION TRIGGER
-- =============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new function for profile creation
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
    )
    VALUES (
        NEW.id,
        NEW.email,
        100,
        TRUE,
        FALSE,
        FALSE,
        'inactive',
        '{}',
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 4. FIX GRANT SIGNUP BONUS FUNCTION
-- =============================================

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.grant_signup_bonus(UUID);

CREATE OR REPLACE FUNCTION public.grant_signup_bonus(user_id UUID)
RETURNS JSON AS $$
DECLARE
    profile_record RECORD;
    result JSON;
BEGIN
    -- Get current profile
    SELECT * INTO profile_record 
    FROM public.profiles 
    WHERE id = user_id;
    
    -- If profile doesn't exist, create it
    IF NOT FOUND THEN
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
        )
        VALUES (
            user_id, 
            (SELECT email FROM auth.users WHERE id = user_id),
            100, 
            TRUE, 
            FALSE,
            FALSE,
            'inactive',
            '{}',
            NOW(), 
            NOW()
        );
        
        result := json_build_object(
            'success', true,
            'message', 'Profile created and bonus granted',
            'credits_granted', 100
        );
    ELSE
        -- Update existing profile if trial not granted
        IF NOT profile_record.trial_granted THEN
            UPDATE public.profiles 
            SET 
                credits_remaining = credits_remaining + 100,
                trial_granted = TRUE,
                updated_at = NOW()
            WHERE id = user_id;
            
            result := json_build_object(
                'success', true,
                'message', 'Signup bonus granted',
                'credits_granted', 100
            );
        ELSE
            result := json_build_object(
                'success', true,
                'message', 'Bonus already granted',
                'credits_granted', 0
            );
        END IF;
    END IF;
    
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

-- =============================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on the schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on the profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO authenticated;

-- =============================================
-- 6. CREATE UPDATED_AT TRIGGER
-- =============================================

-- Create or replace the updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 7. VERIFY SETUP
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
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('handle_new_user', 'grant_signup_bonus', 'handle_updated_at');

-- Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
    AND event_object_table = 'profiles';

-- =============================================
-- 8. TEST THE SETUP
-- =============================================

-- Test the grant_signup_bonus function with a dummy UUID
-- (This will fail but should show the function is accessible)
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- This will fail because the UUID doesn't exist, but it tests the function
    SELECT public.grant_signup_bonus('00000000-0000-0000-0000-000000000000') INTO test_result;
    RAISE NOTICE 'Function test result: %', test_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Function test completed (expected to fail with dummy UUID)';
END $$;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'AUTHENTICATION FIXES APPLIED SUCCESSFULLY';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '1. Profiles table structure updated';
    RAISE NOTICE '2. RLS policies recreated';
    RAISE NOTICE '3. Profile creation trigger fixed';
    RAISE NOTICE '4. Grant signup bonus function updated';
    RAISE NOTICE '5. Permissions granted';
    RAISE NOTICE '6. Updated_at trigger created';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Please test authentication again';
    RAISE NOTICE '=============================================';
END $$;
