// Quick Test After Database Fix
console.log('🧪 Quick Authentication Test After Database Fix...');

// Use your existing Supabase configuration
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

// Import and create Supabase client
import('https://cdn.skypack.dev/@supabase/supabase-js@2').then(({ createClient }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client ready');
    
    // Run quick test
    quickTest(supabase);
}).catch(err => {
    console.log('❌ Failed to import Supabase:', err.message);
});

async function quickTest(supabase) {
    const testEmail = `quick-test-${Date.now()}@example.com`;
    const testPassword = 'QuickTest123!';
    
    console.log(`\n🧪 Testing with email: ${testEmail}`);
    
    try {
        // Test 1: Signup
        console.log('1️⃣ Testing signup...');
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Signup failed:', error.message);
            console.log('💡 This might indicate the database fix needs to be applied');
            return;
        } else {
            console.log('✅ Signup successful!');
            console.log('User ID:', data.user?.id);
            
            // Test 2: Profile Creation (wait a bit for trigger)
            console.log('\n2️⃣ Testing profile creation...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.log('❌ Profile creation failed:', profileError.message);
            } else {
                console.log('✅ Profile created successfully!');
                console.log('Credits:', profile.credits_remaining);
            }
            
            // Test 3: Signin
            console.log('\n3️⃣ Testing signin...');
            const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            if (signinError) {
                console.log('❌ Signin failed:', signinError.message);
            } else {
                console.log('✅ Signin successful!');
                console.log('Session active:', !!signinData.session);
            }
        }
    } catch (err) {
        console.log('❌ Test error:', err.message);
    }
    
    console.log('\n🎉 Quick test completed!');
    console.log('If you see ✅ for all tests, the database fix worked!');
}
