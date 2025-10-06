// Quick Authentication Test Script
// Run this in the browser console to test authentication

console.log('🔐 Starting Quick Authentication Test...');

// Test 1: Check if Supabase is available
console.log('\n1️⃣ Testing Supabase availability...');
if (typeof window.supabase !== 'undefined') {
    console.log('✅ Supabase client found');
} else {
    console.log('❌ Supabase client not found. Make sure you are on a page with Supabase initialized.');
    console.log('   Try running this on the login or signup page.');
}

// Test 2: Check authentication components
console.log('\n2️⃣ Testing authentication components...');
const loginForm = document.querySelector('form');
const signupForm = document.querySelector('form');
const googleButton = document.querySelector('[data-provider="google"]') || document.querySelector('button[class*="google"]');

if (loginForm || signupForm) {
    console.log('✅ Authentication forms found');
    
    // Check form fields
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    
    if (emailInput && passwordInput) {
        console.log('✅ Email and password inputs found');
    } else {
        console.log('⚠️ Email or password inputs missing');
    }
} else {
    console.log('❌ No authentication forms found');
}

if (googleButton) {
    console.log('✅ Google OAuth button found');
} else {
    console.log('⚠️ Google OAuth button not found');
}

// Test 3: Check for error handling components
console.log('\n3️⃣ Testing error handling...');
const errorDisplay = document.querySelector('[class*="error"]') || document.querySelector('[class*="Error"]');
if (errorDisplay) {
    console.log('✅ Error display components found');
} else {
    console.log('ℹ️ No error display components visible (this is normal if no errors)');
}

// Test 4: Check for loading states
console.log('\n4️⃣ Testing loading states...');
const loadingButton = document.querySelector('button[disabled]') || document.querySelector('[class*="loading"]');
if (loadingButton) {
    console.log('✅ Loading states found');
} else {
    console.log('ℹ️ No loading states visible (this is normal if not loading)');
}

// Test 5: Check URL parameters for auth errors
console.log('\n5️⃣ Testing URL error parameters...');
const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('error');
const errorDescription = urlParams.get('error_description');

if (error) {
    console.log(`⚠️ Auth error in URL: ${error}`);
    if (errorDescription) {
        console.log(`   Description: ${errorDescription}`);
    }
} else {
    console.log('✅ No auth errors in URL');
}

// Test 6: Check for auth callback handling
console.log('\n6️⃣ Testing auth callback...');
if (window.location.pathname.includes('/auth/callback')) {
    console.log('✅ On auth callback page');
    
    const code = urlParams.get('code');
    if (code) {
        console.log('✅ OAuth code found in URL');
    } else {
        console.log('⚠️ No OAuth code in URL');
    }
} else {
    console.log('ℹ️ Not on auth callback page');
}

// Test 7: Check session state
console.log('\n7️⃣ Testing session state...');
if (typeof window.supabase !== 'undefined') {
    window.supabase.auth.getUser().then(({ data, error }) => {
        if (error && error.message !== 'Auth session missing!') {
            console.log(`❌ Session error: ${error.message}`);
        } else if (data.user) {
            console.log(`✅ Active session for: ${data.user.email}`);
        } else {
            console.log('ℹ️ No active session (user not logged in)');
        }
    }).catch(err => {
        console.log(`❌ Session check failed: ${err.message}`);
    });
} else {
    console.log('⚠️ Cannot check session - Supabase not available');
}

// Test 8: Check for validation
console.log('\n8️⃣ Testing form validation...');
if (loginForm || signupForm) {
    const form = loginForm || signupForm;
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');
    
    if (emailInput && passwordInput) {
        // Test invalid email
        emailInput.value = 'invalid-email';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        setTimeout(() => {
            const emailError = form.querySelector('[class*="error"]') || form.querySelector('.text-red-500');
            if (emailError) {
                console.log('✅ Email validation working');
            } else {
                console.log('⚠️ Email validation not visible');
            }
            
            // Reset
            emailInput.value = '';
        }, 100);
    }
}

// Test 9: Check for toast notifications
console.log('\n9️⃣ Testing toast notifications...');
const toastContainer = document.querySelector('[class*="toast"]') || document.querySelector('[data-sonner-toaster]');
if (toastContainer) {
    console.log('✅ Toast notification system found');
} else {
    console.log('ℹ️ Toast notification system not visible (this is normal if no toasts)');
}

// Test 10: Check for navigation
console.log('\n🔟 Testing navigation...');
const signupLink = document.querySelector('a[href*="signup"]') || document.querySelector('a[href*="register"]');
const loginLink = document.querySelector('a[href*="login"]') || document.querySelector('a[href*="signin"]');

if (signupLink) {
    console.log('✅ Signup link found');
} else {
    console.log('ℹ️ Signup link not found');
}

if (loginLink) {
    console.log('✅ Login link found');
} else {
    console.log('ℹ️ Login link not found');
}

console.log('\n🎉 Quick authentication test completed!');
console.log('\n📋 Summary:');
console.log('- Check the results above for any ❌ errors');
console.log('- If you see ✅ for most items, authentication is working');
console.log('- For detailed testing, use the browser-auth-test.html file');
console.log('- For manual testing, follow the manual-auth-test.md guide');

// Helper function to test actual authentication
window.testAuth = async function(email = 'test@example.com', password = 'TestPassword123!') {
    if (typeof window.supabase === 'undefined') {
        console.log('❌ Supabase not available for testing');
        return;
    }
    
    console.log('🧪 Testing actual authentication...');
    
    try {
        // Test signup
        console.log('Testing signup...');
        const { data: signupData, error: signupError } = await window.supabase.auth.signUp({
            email: email.replace('@', `+${Date.now()}@`), // Make unique
            password: password,
        });
        
        if (signupError) {
            console.log(`❌ Signup failed: ${signupError.message}`);
        } else {
            console.log('✅ Signup successful');
        }
        
        // Test signin
        console.log('Testing signin...');
        const { data: signinData, error: signinError } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (signinError) {
            console.log(`❌ Signin failed: ${signinError.message}`);
        } else {
            console.log('✅ Signin successful');
        }
        
    } catch (error) {
        console.log(`❌ Auth test error: ${error.message}`);
    }
};

console.log('\n💡 To test actual authentication, run: testAuth("your-email@example.com", "your-password")');
