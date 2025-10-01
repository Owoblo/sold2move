-- =============================================
-- UPDATE SIGNUP BONUS TO 100 CREDITS
-- =============================================

-- Update the grant_signup_bonus function to give 100 credits instead of 500
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
        VALUES (user_id, 100, TRUE, NOW(), NOW());
        
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
-- VERIFY THE UPDATE
-- =============================================

-- Check the function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'grant_signup_bonus';

-- Test the function (optional - uncomment to test)
-- SELECT public.grant_signup_bonus('00000000-0000-0000-0000-000000000000'::UUID);
