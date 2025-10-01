# 🔐 Authentication Flow Test Plan

## ✅ **Test 1: Google OAuth Sign Up**
1. **Navigate to**: `http://localhost:5173/signup`
2. **Click**: "Sign up with Google"
3. **Expected**: 
   - Redirects to Google OAuth
   - After Google auth, redirects to `/auth/callback`
   - Then redirects to `/post-auth`
   - Profile created with 100 credits
   - Redirects to `/onboarding` or `/dashboard`

## ✅ **Test 2: Google OAuth Login**
1. **Navigate to**: `http://localhost:5173/login`
2. **Click**: "Login with Google"
3. **Expected**:
   - Redirects to Google OAuth
   - After Google auth, redirects to `/auth/callback`
   - Then redirects to `/post-auth`
   - Existing profile loaded
   - Redirects to `/dashboard`

## ✅ **Test 3: Email/Password Sign Up**
1. **Navigate to**: `http://localhost:5173/signup`
2. **Fill form**:
   - Email: `test@example.com`
   - Password: `password123`
3. **Click**: "Sign up"
4. **Expected**:
   - Account created successfully
   - Profile created with 100 credits
   - Redirects to `/signup-success`

## ✅ **Test 4: Email/Password Login**
1. **Navigate to**: `http://localhost:5173/login`
2. **Fill form**:
   - Email: `test@example.com`
   - Password: `password123`
3. **Click**: "Login"
4. **Expected**:
   - Login successful
   - Redirects to `/dashboard`

## 🔍 **What to Check in Database**
- Profile created in `profiles` table
- `credits_remaining` = 100
- `trial_granted` = true
- `business_email` matches user email
- `created_at` and `updated_at` timestamps

## 🚨 **Error Scenarios to Test**
- Invalid email format
- Weak password
- Google OAuth cancellation
- Network errors
- Duplicate email signup

## 📱 **Mobile Testing**
- Test on mobile device
- Check responsive design
- Verify touch interactions
- Test Google OAuth on mobile browser
