// Final Authentication Test - After Complete Reset
console.log('🎯 Final Authentication Test - After Complete Reset...');

// Use your existing Supabase configuration
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

// Import and create Supabase client
import('https://cdn.skypack.dev/@supabase/supabase-js@2').then(({ createClient }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client ready');
    
    // Run final test
    finalTest(supabase);
}).catch(err => {
    console.log('❌ Failed to import Supabase:', err.message);
});

async function finalTest(supabase) {
    const testEmail = `final-test-${Date.now()}@example.com`;
    const testPassword = 'FinalTest123!';
    
    console.log(`\n🎯 Testing with email: ${testEmail}`);
    
    try {
        // Test 1: Signup (should work now without any triggers)
        console.log('1️⃣ Testing signup...');
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Signup failed:', error.message);
            console.log('💡 This indicates a deeper Supabase configuration issue');
            console.log('💡 Check your Supabase project settings and auth configuration');
            return;
        } else {
            console.log('✅ Signup successful!');
            console.log('User ID:', data.user?.id);
            console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
            
            // Test 2: Manual Profile Creation using the new function
            console.log('\n2️⃣ Testing manual profile creation...');
            const { data: profileResult, error: profileError } = await supabase.rpc('create_profile_manual', {
                user_id: data.user.id,
                user_email: testEmail
            });

            if (profileError) {
                console.log('❌ Manual profile creation failed:', profileError.message);
            } else {
                console.log('✅ Manual profile creation successful!');
                console.log('Profile result:', profileResult);
            }
            
            // Test 3: Check if profile was created
            console.log('\n3️⃣ Verifying profile creation...');
            const { data: profile, error: profileCheckError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileCheckError) {
                console.log('❌ Profile verification failed:', profileCheckError.message);
            } else {
                console.log('✅ Profile verification successful!');
                console.log('Profile data:', profile);
            }
            
            // Test 4: Signup Bonus using the new function
            console.log('\n4️⃣ Testing signup bonus...');
            const { data: bonusResult, error: bonusError } = await supabase.rpc('grant_bonus_manual', {
                user_id: data.user.id
            });

            if (bonusError) {
                console.log('❌ Signup bonus failed:', bonusError.message);
            } else {
                console.log('✅ Signup bonus successful!');
                console.log('Bonus result:', bonusResult);
            }
            
            // Test 5: Signin
            console.log('\n5️⃣ Testing signin...');
            const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            if (signinError) {
                console.log('❌ Signin failed:', signinError.message);
            } else {
                console.log('✅ Signin successful!');
                console.log('User:', signinData.user?.email);
                console.log('Session active:', !!signinData.session);
            }
        }
    } catch (err) {
        console.log('❌ Test error:', err.message);
    }
    
    console.log('\n🎉 Final test completed!');
    console.log('If you see ✅ for signup, the auth system is working!');
    console.log('Profile creation is now handled manually in the application.');
}
