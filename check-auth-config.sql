-- Check Supabase Auth Configuration
-- This script helps identify auth-related issues

-- =============================================
-- 1. CHECK AUTH USERS TABLE STRUCTURE
-- =============================================

-- Check if auth.users table exists and is accessible
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
    AND table_schema = 'auth'
ORDER BY ordinal_position;

-- =============================================
-- 2. CHECK FOR AUTH TRIGGERS
-- =============================================

-- Check all triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
    AND event_object_table = 'users';

-- =============================================
-- 3. CHECK FOR AUTH FUNCTIONS
-- =============================================

-- Check all functions in auth schema
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'auth';

-- =============================================
-- 4. CHECK FOR AUTH CONSTRAINTS
-- =============================================

-- Check constraints on auth.users
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass;

-- =============================================
-- 5. CHECK AUTH POLICIES
-- =============================================

-- Check RLS policies on auth.users
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
WHERE schemaname = 'auth' AND tablename = 'users';

-- =============================================
-- 6. CHECK AUTH PERMISSIONS
-- =============================================

-- Check permissions on auth schema
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'auth' 
    AND table_name = 'users';

-- =============================================
-- 7. CHECK FOR CUSTOM AUTH FUNCTIONS
-- =============================================

-- Check for any custom functions that might interfere with auth
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_definition LIKE '%auth.users%';

-- =============================================
-- 8. CHECK FOR CUSTOM TRIGGERS ON AUTH
-- =============================================

-- Check for any custom triggers on auth tables
SELECT 
    trigger_name,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%auth%';

-- =============================================
-- 9. TEST BASIC AUTH OPERATIONS
-- =============================================

-- Test if we can query auth.users (this should work)
DO $$
BEGIN
    PERFORM 1 FROM auth.users LIMIT 1;
    RAISE NOTICE 'auth.users table is accessible';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'auth.users table access error: %', SQLERRM;
END $$;

-- =============================================
-- 10. CHECK SUPABASE VERSION AND CONFIG
-- =============================================

-- Check Supabase version
SELECT version();

-- Check current database name
SELECT current_database();

-- Check current user
SELECT current_user;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'AUTH CONFIGURATION CHECK COMPLETED';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Review the results above for any issues';
    RAISE NOTICE 'Look for:';
    RAISE NOTICE '- Missing or incorrect triggers';
    RAISE NOTICE '- Permission issues';
    RAISE NOTICE '- Constraint problems';
    RAISE NOTICE '- Custom functions interfering with auth';
    RAISE NOTICE '=============================================';
END $$;
