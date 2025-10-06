# 🤖 Supabase AI Assistant Prompt

## Copy and paste this prompt into the Supabase AI Assistant:

---

**I'm experiencing a critical authentication issue in my Supabase project. Users cannot sign up or sign in, and I'm getting "Database error saving new user" errors even after removing all custom triggers and functions.**

**Project Details:**
- Project ID: idbyrtwdeeruiutoukct
- Error: "Database error saving new user" (500 Internal Server Error)
- Issue persists even with completely clean database (no custom triggers/functions)

**What I've Already Tried:**
1. Removed all custom triggers on auth.users table
2. Removed all custom functions that might interfere with auth
3. Recreated profiles table from scratch
4. Reset all RLS policies to be permissive
5. Granted all necessary permissions to authenticated/anon roles
6. Disabled all custom auth hooks
7. Reset authentication settings to defaults

**Current Error Details:**
- Error Code: unexpected_failure
- Error Message: Database error saving new user
- HTTP Status: 500 Internal Server Error
- Endpoint: /auth/v1/signup
- Occurs even with simple test: supabase.auth.signUp({ email: 'test@example.com', password: 'password123' })

**What I Need:**
1. Diagnose the root cause of the "Database error saving new user" issue
2. Fix the authentication system so users can sign up and sign in
3. Ensure the profiles table can be created/managed properly
4. Provide a working authentication flow

**Please:**
1. Check my project configuration for any issues
2. Identify what's causing the database error during user creation
3. Fix the authentication system
4. Test that signup/signin works
5. Ensure proper profile creation workflow
6. Provide any necessary SQL scripts or configuration changes

**I need this fixed urgently as users cannot access the application. Please provide a complete solution.**

---

## Additional Context to Include:

**If the AI asks for more details, provide:**

1. **Project Status**: Active, not paused
2. **Authentication Settings**: Email confirmation disabled, no custom SMTP
3. **Database Status**: Healthy, no connection issues
4. **Quotas**: Not hitting any limits
5. **Region**: Check current region
6. **Auth Hooks**: All disabled
7. **Edge Functions**: All disabled
8. **Logs**: Check for any error messages in Auth logs

**Expected Outcome:**
- Users can sign up with email/password
- Users can sign in with email/password
- Profile creation works (either automatic or manual)
- No more "Database error saving new user" errors

**Priority**: This is blocking all user access to the application.
