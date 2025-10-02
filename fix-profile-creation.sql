-- Fix Profile Creation Issues for Sold2Move
-- Run this in your Supabase SQL editor to fix profile creation problems

-- =============================================
-- ENSURE PROFILES TABLE EXISTS WITH CORRECT SCHEMA
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_name TEXT,
    phone TEXT,
    business_email TEXT,
    country_code TEXT,
    state_code TEXT,
    city_name TEXT,
    service_cities TEXT[] DEFAULT '{}',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    credits_remaining INTEGER DEFAULT 100,
    unlimited BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive',
    stripe_customer_id TEXT,
    trial_granted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- UPDATE DEFAULT CREDITS TO 100
-- =============================================

ALTER TABLE public.profiles ALTER COLUMN credits_remaining SET DEFAULT 100;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING POLICIES (if any)
-- =============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- =============================================
-- CREATE OR REPLACE GRANT SIGNUP BONUS FUNCTION
-- =============================================

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on the schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on the profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO authenticated;

-- =============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- =============================================

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
-- VERIFY SETUP
-- =============================================

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'grant_signup_bonus';
