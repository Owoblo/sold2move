-- Authentication and Profile Creation Fixes for Sold2Move
-- Run this in your Supabase SQL editor to fix authentication issues

-- =============================================
-- CREATE PROFILES TABLE IF NOT EXISTS
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
    credits_remaining INTEGER DEFAULT 500,
    unlimited BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive',
    stripe_customer_id TEXT,
    trial_granted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREATE LISTING_REVEALS TABLE IF NOT EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.listing_reveals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREATE RUNS TABLE IF NOT EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reveals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Listing reveals policies
CREATE POLICY "Users can view own reveals" ON public.listing_reveals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reveals" ON public.listing_reveals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- AUTOMATIC PROFILE CREATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, business_email, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER FOR AUTOMATIC PROFILE CREATION
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- GRANT SIGNUP BONUS FUNCTION
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
        INSERT INTO public.profiles (id, credits_remaining, trial_granted, created_at, updated_at)
        VALUES (user_id, 500, TRUE, NOW(), NOW());
        
        result := json_build_object(
            'success', true,
            'message', 'Profile created and bonus granted',
            'credits_granted', 500
        );
    ELSE
        -- Update existing profile if trial not granted
        IF NOT profile_record.trial_granted THEN
            UPDATE public.profiles 
            SET 
                credits_remaining = credits_remaining + 500,
                trial_granted = TRUE,
                updated_at = NOW()
            WHERE id = user_id;
            
            result := json_build_object(
                'success', true,
                'message', 'Signup bonus granted',
                'credits_granted', 500
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
-- REVEAL LISTING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.reveal_listing(p_listing_id TEXT)
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    profile_record RECORD;
    credit_cost INTEGER := 1;
    result JSON;
BEGIN
    -- Get current user
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object(
            'ok', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Get user profile
    SELECT * INTO profile_record 
    FROM public.profiles 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'ok', false,
            'error', 'Profile not found'
        );
    END IF;
    
    -- Check if user has unlimited access
    IF profile_record.unlimited THEN
        -- Check if already revealed
        IF EXISTS (SELECT 1 FROM public.listing_reveals WHERE user_id = user_id AND listing_id = p_listing_id) THEN
            RETURN json_build_object(
                'ok', true,
                'already_revealed', true,
                'message', 'Already revealed'
            );
        ELSE
            -- Add to reveals
            INSERT INTO public.listing_reveals (user_id, listing_id)
            VALUES (user_id, p_listing_id);
            
            RETURN json_build_object(
                'ok', true,
                'already_revealed', false,
                'message', 'Revealed successfully'
            );
        END IF;
    END IF;
    
    -- Check if already revealed
    IF EXISTS (SELECT 1 FROM public.listing_reveals WHERE user_id = user_id AND listing_id = p_listing_id) THEN
        RETURN json_build_object(
            'ok', true,
            'already_revealed', true,
            'message', 'Already revealed'
        );
    END IF;
    
    -- Check credits
    IF profile_record.credits_remaining < credit_cost THEN
        RETURN json_build_object(
            'ok', false,
            'error', 'insufficient_credits',
            'message', 'Insufficient credits'
        );
    END IF;
    
    -- Deduct credits and add reveal
    UPDATE public.profiles 
    SET 
        credits_remaining = credits_remaining - credit_cost,
        updated_at = NOW()
    WHERE id = user_id;
    
    INSERT INTO public.listing_reveals (user_id, listing_id)
    VALUES (user_id, p_listing_id);
    
    RETURN json_build_object(
        'ok', true,
        'already_revealed', false,
        'message', 'Revealed successfully',
        'credits_remaining', profile_record.credits_remaining - credit_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.listing_reveals TO authenticated;
GRANT ALL ON public.runs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.grant_signup_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_listing(TEXT) TO authenticated;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_city_name ON public.profiles(city_name);
CREATE INDEX IF NOT EXISTS idx_listing_reveals_user_id ON public.listing_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_reveals_listing_id ON public.listing_reveals(listing_id);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON public.runs(started_at);

-- =============================================
-- TEST DATA (OPTIONAL - FOR DEVELOPMENT)
-- =============================================

-- Uncomment the following lines to create test data
-- INSERT INTO public.runs (id, started_at, ended_at) 
-- VALUES 
--     ('550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'),
--     ('550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '30 minutes', NOW());

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'listing_reveals', 'runs')
ORDER BY tablename;

-- Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'grant_signup_bonus', 'reveal_listing')
ORDER BY routine_name;

-- Check if triggers exist
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- =============================================
-- USAGE INSTRUCTIONS
-- =============================================

/*
To fix authentication issues:

1. Run this entire script in your Supabase SQL editor
2. Verify all tables, functions, and triggers were created successfully
3. Test the authentication flow:
   - Sign up with email/password
   - Sign up with Google OAuth
   - Sign in with both methods
4. Check that profiles are automatically created
5. Test the reveal listing functionality

Expected fixes:
- ✅ Automatic profile creation on user signup
- ✅ Proper RLS policies for data security
- ✅ Google OAuth should work correctly
- ✅ Database errors should be resolved
- ✅ Signup bonus credits should be granted automatically

If you still have issues:
1. Check Supabase Auth settings in the dashboard
2. Verify Google OAuth is properly configured
3. Check the browser console for any JavaScript errors
4. Verify the redirect URLs are correct in Supabase Auth settings
*/
