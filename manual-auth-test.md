# 🔐 Manual Authentication Testing Guide

## 🎯 **Test Objectives**
Verify that the signin and signup workflows work correctly for both email/password and Google OAuth authentication.

## 🧪 **Test Environment Setup**

### Prerequisites
1. Ensure the application is running locally or on staging
2. Have access to a test email account
3. Have Google account access for OAuth testing
4. Browser developer tools open for console monitoring

## 📋 **Test Cases**

### **1. Email/Password Sign Up**

#### Test Steps:
1. Navigate to `/signup` page
2. Fill in the signup form:
   - Email: `test-${timestamp}@example.com`
   - Password: `TestPassword123!`
3. Click "Sign Up" button
4. Verify the following:

#### Expected Results:
- ✅ Form validation works (try invalid email/password)
- ✅ Success message appears
- ✅ User is redirected to appropriate page
- ✅ Signup bonus credits are granted (check console logs)
- ✅ User profile is created in database

#### Test Invalid Cases:
- Empty email field
- Invalid email format (`invalid-email`)
- Password too short (`123`)
- Empty password field

### **2. Email/Password Sign In**

#### Test Steps:
1. Navigate to `/login` page
2. Fill in the login form:
   - Email: Use the email from signup test
   - Password: Use the password from signup test
3. Click "Sign In" button
4. Verify the following:

#### Expected Results:
- ✅ User is authenticated successfully
- ✅ Session is created and stored
- ✅ User is redirected to dashboard
- ✅ User profile data is loaded

#### Test Invalid Cases:
- Wrong email
- Wrong password
- Non-existent user
- Empty fields

### **3. Google OAuth Sign In**

#### Test Steps:
1. Navigate to `/login` page
2. Click "Sign in with Google" button
3. Complete Google OAuth flow:
   - Select Google account
   - Grant permissions
   - Complete OAuth flow
4. Verify the following:

#### Expected Results:
- ✅ OAuth URL is generated correctly
- ✅ User is redirected to Google
- ✅ After OAuth, user is redirected to `/auth/callback`
- ✅ Session is created successfully
- ✅ User is redirected to dashboard
- ✅ User profile is created/updated

### **4. Auth Callback Handling**

#### Test Steps:
1. Manually navigate to `/auth/callback?code=test-code`
2. Manually navigate to `/auth/callback?error=access_denied`
3. Manually navigate to `/auth/callback` (no parameters)
4. Verify the following:

#### Expected Results:
- ✅ Valid OAuth code is processed correctly
- ✅ OAuth errors are displayed properly
- ✅ Missing code shows appropriate error message
- ✅ Error display component works correctly

### **5. Session Management**

#### Test Steps:
1. Sign in successfully
2. Refresh the page
3. Close and reopen browser
4. Check session persistence
5. Sign out and verify session is cleared

#### Expected Results:
- ✅ Session persists across page refreshes
- ✅ Session persists across browser restarts
- ✅ User remains authenticated
- ✅ Sign out clears session completely

### **6. Error Handling**

#### Test Cases:
1. **Network Errors**: Disconnect internet during auth
2. **Rate Limiting**: Make multiple rapid requests
3. **Server Errors**: Test with invalid Supabase config
4. **Malformed Data**: Test with corrupted auth data

#### Expected Results:
- ✅ Network errors are handled gracefully
- ✅ Rate limiting shows appropriate message
- ✅ Server errors don't crash the app
- ✅ Malformed data is rejected properly

## 🔍 **Browser Console Testing**

### Run Integration Tests:
```javascript
// Load the test script
const script = document.createElement('script');
script.src = '/src/tests/auth-integration-test.js';
document.head.appendChild(script);

// Run tests after script loads
setTimeout(async () => {
  const tester = new AuthTester();
  await tester.runAllTests();
  await tester.cleanup();
}, 1000);
```

### Manual Console Tests:
```javascript
// Test Supabase connection
const { data, error } = await supabase.auth.getUser();
console.log('Current user:', data.user);

// Test signup
const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
});
console.log('Signup result:', signupData, signupError);

// Test signin
const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});
console.log('Signin result:', signinData, signinError);

// Test Google OAuth
const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin + '/auth/callback' }
});
console.log('OAuth URL:', oauthData.url);
```

## 📊 **Test Results Checklist**

### Email/Password Signup
- [ ] Form validation works
- [ ] Successful signup creates user
- [ ] Signup bonus is granted
- [ ] User is redirected correctly
- [ ] Error messages are appropriate

### Email/Password Signin
- [ ] Valid credentials work
- [ ] Invalid credentials are rejected
- [ ] Session is created
- [ ] User is redirected to dashboard
- [ ] Profile data is loaded

### Google OAuth
- [ ] OAuth URL is generated
- [ ] Google OAuth flow completes
- [ ] Callback handling works
- [ ] Session is created
- [ ] User profile is created/updated

### Error Handling
- [ ] Network errors handled
- [ ] Invalid data rejected
- [ ] Rate limiting works
- [ ] Server errors don't crash app
- [ ] Error messages are user-friendly

### Session Management
- [ ] Session persists across refreshes
- [ ] Session persists across browser restarts
- [ ] Sign out clears session
- [ ] Session expiration handled

## 🐛 **Common Issues to Check**

1. **CORS Issues**: Check browser console for CORS errors
2. **Environment Variables**: Verify Supabase URL and keys
3. **Redirect URLs**: Check OAuth redirect URLs are configured
4. **Email Confirmation**: Check if email confirmation is required
5. **Rate Limiting**: Test with multiple rapid requests
6. **Network Issues**: Test with slow/unstable connections

## 📝 **Test Report Template**

```
Authentication Test Report
=========================

Date: [DATE]
Tester: [NAME]
Environment: [LOCAL/STAGING/PRODUCTION]

Test Results:
- Email/Password Signup: [PASS/FAIL]
- Email/Password Signin: [PASS/FAIL]
- Google OAuth: [PASS/FAIL]
- Auth Callback: [PASS/FAIL]
- Session Management: [PASS/FAIL]
- Error Handling: [PASS/FAIL]

Issues Found:
1. [ISSUE DESCRIPTION]
2. [ISSUE DESCRIPTION]

Recommendations:
1. [RECOMMENDATION]
2. [RECOMMENDATION]

Overall Status: [PASS/FAIL]
```

## 🚀 **Quick Test Commands**

```bash
# Run the test suite
npm test auth.test.js

# Run integration tests in browser
# (Copy and paste the JavaScript code above into browser console)

# Check authentication status
# (Use the manual console tests above)
```

This comprehensive testing approach will ensure that all authentication workflows are working correctly! 🎉
