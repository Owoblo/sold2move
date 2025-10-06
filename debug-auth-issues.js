// Debug Authentication Issues Script
// Run this in browser console to diagnose signup/signin problems

console.log('🔍 Starting Authentication Debug...');

async function debugAuthIssues() {
    const results = {
        supabaseConnection: false,
        signupTest: null,
        signinTest: null,
        profileCreation: null,
        edgeFunction: null,
        databaseIssues: []
    };

    // Test 1: Supabase Connection
    console.log('\n1️⃣ Testing Supabase Connection...');
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error && error.message !== 'Auth session missing!') {
            console.log('❌ Supabase connection failed:', error.message);
            results.databaseIssues.push(`Supabase connection: ${error.message}`);
        } else {
            console.log('✅ Supabase connection successful');
            results.supabaseConnection = true;
        }
    } catch (err) {
        console.log('❌ Supabase connection error:', err.message);
        results.databaseIssues.push(`Supabase connection error: ${err.message}`);
    }

    // Test 2: Signup Test
    console.log('\n2️⃣ Testing Signup Process...');
    const testEmail = `debug-test-${Date.now()}@example.com`;
    const testPassword = 'DebugTest123!';
    
    try {
        console.log(`Testing signup with: ${testEmail}`);
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Signup failed:', error.message);
            results.signupTest = { success: false, error: error.message };
            results.databaseIssues.push(`Signup error: ${error.message}`);
        } else {
            console.log('✅ Signup successful');
            console.log('User ID:', data.user?.id);
            console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
            results.signupTest = { success: true, userId: data.user?.id, emailConfirmed: !!data.user?.email_confirmed_at };
        }
    } catch (err) {
        console.log('❌ Signup error:', err.message);
        results.signupTest = { success: false, error: err.message };
        results.databaseIssues.push(`Signup error: ${err.message}`);
    }

    // Test 3: Profile Creation Check
    console.log('\n3️⃣ Testing Profile Creation...');
    if (results.signupTest?.success && results.signupTest.userId) {
        try {
            // Wait a moment for triggers to run
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', results.signupTest.userId)
                .single();

            if (profileError) {
                console.log('❌ Profile creation failed:', profileError.message);
                results.profileCreation = { success: false, error: profileError.message };
                results.databaseIssues.push(`Profile creation: ${profileError.message}`);
            } else {
                console.log('✅ Profile created successfully');
                console.log('Profile data:', profile);
                results.profileCreation = { success: true, data: profile };
            }
        } catch (err) {
            console.log('❌ Profile check error:', err.message);
            results.profileCreation = { success: false, error: err.message };
            results.databaseIssues.push(`Profile check: ${err.message}`);
        }
    }

    // Test 4: Edge Function Test
    console.log('\n4️⃣ Testing Signup Bonus Edge Function...');
    if (results.signupTest?.success && results.signupTest.userId) {
        try {
            const { data, error } = await supabase.functions.invoke('grant-signup-bonus', {
                body: JSON.stringify({ user_id: results.signupTest.userId }),
            });

            if (error) {
                console.log('❌ Edge function failed:', error.message);
                results.edgeFunction = { success: false, error: error.message };
                results.databaseIssues.push(`Edge function: ${error.message}`);
            } else {
                console.log('✅ Edge function successful');
                console.log('Function result:', data);
                results.edgeFunction = { success: true, data: data };
            }
        } catch (err) {
            console.log('❌ Edge function error:', err.message);
            results.edgeFunction = { success: false, error: err.message };
            results.databaseIssues.push(`Edge function error: ${err.message}`);
        }
    }

    // Test 5: Signin Test
    console.log('\n5️⃣ Testing Signin Process...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Signin failed:', error.message);
            results.signinTest = { success: false, error: error.message };
            results.databaseIssues.push(`Signin error: ${error.message}`);
        } else {
            console.log('✅ Signin successful');
            console.log('User:', data.user?.email);
            console.log('Session active:', !!data.session);
            results.signinTest = { success: true, user: data.user?.email };
        }
    } catch (err) {
        console.log('❌ Signin error:', err.message);
        results.signinTest = { success: false, error: err.message };
        results.databaseIssues.push(`Signin error: ${err.message}`);
    }

    // Test 6: Database Schema Check
    console.log('\n6️⃣ Checking Database Schema...');
    try {
        const { data: columns, error: schemaError } = await supabase
            .from('profiles')
            .select('*')
            .limit(0);

        if (schemaError) {
            console.log('❌ Schema check failed:', schemaError.message);
            results.databaseIssues.push(`Schema check: ${schemaError.message}`);
        } else {
            console.log('✅ Profiles table accessible');
        }
    } catch (err) {
        console.log('❌ Schema check error:', err.message);
        results.databaseIssues.push(`Schema check error: ${err.message}`);
    }

    // Summary
    console.log('\n📊 Debug Summary:');
    console.log('==================');
    console.log('Supabase Connection:', results.supabaseConnection ? '✅' : '❌');
    console.log('Signup Test:', results.signupTest?.success ? '✅' : '❌');
    console.log('Profile Creation:', results.profileCreation?.success ? '✅' : '❌');
    console.log('Edge Function:', results.edgeFunction?.success ? '✅' : '❌');
    console.log('Signin Test:', results.signinTest?.success ? '✅' : '❌');

    if (results.databaseIssues.length > 0) {
        console.log('\n🐛 Issues Found:');
        results.databaseIssues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue}`);
        });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!results.supabaseConnection) {
        console.log('- Check Supabase URL and anon key');
        console.log('- Verify network connectivity');
    }
    if (!results.signupTest?.success) {
        console.log('- Check if email confirmation is required');
        console.log('- Verify password requirements');
        console.log('- Check for database constraints');
    }
    if (!results.profileCreation?.success) {
        console.log('- Check database triggers and functions');
        console.log('- Verify RLS policies on profiles table');
        console.log('- Check if profiles table exists and is accessible');
    }
    if (!results.edgeFunction?.success) {
        console.log('- Check if grant-signup-bonus Edge Function is deployed');
        console.log('- Verify Edge Function environment variables');
        console.log('- Check Edge Function logs in Supabase dashboard');
    }
    if (!results.signinTest?.success) {
        console.log('- Verify user was created successfully');
        console.log('- Check if email confirmation is required');
        console.log('- Verify password is correct');
    }

    return results;
}

// Run the debug
debugAuthIssues().then(results => {
    console.log('\n🎯 Debug completed. Check the summary above for issues.');
    
    // Store results globally for further analysis
    window.authDebugResults = results;
    
    // If there are issues, provide specific fixes
    if (results.databaseIssues.length > 0) {
        console.log('\n🔧 Suggested Fixes:');
        console.log('1. Run the database migration scripts in Supabase SQL Editor');
        console.log('2. Check Edge Functions are deployed and configured');
        console.log('3. Verify RLS policies are correctly set');
        console.log('4. Check if email confirmation is required in Supabase Auth settings');
    }
});

// Export for manual testing
window.debugAuthIssues = debugAuthIssues;
