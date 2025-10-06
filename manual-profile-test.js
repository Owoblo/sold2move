// Manual Profile Creation Test
// This test works without automatic triggers

console.log('🧪 Manual Profile Creation Test...');

// Use your existing Supabase configuration
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

// Import and create Supabase client
import('https://cdn.skypack.dev/@supabase/supabase-js@2').then(({ createClient }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client ready');
    
    // Run manual test
    manualTest(supabase);
}).catch(err => {
    console.log('❌ Failed to import Supabase:', err.message);
});

async function manualTest(supabase) {
    const testEmail = `manual-test-${Date.now()}@example.com`;
    const testPassword = 'ManualTest123!';
    
    console.log(`\n🧪 Testing with email: ${testEmail}`);
    
    try {
        // Test 1: Signup (should work without triggers now)
        console.log('1️⃣ Testing signup...');
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Signup failed:', error.message);
            return;
        } else {
            console.log('✅ Signup successful!');
            console.log('User ID:', data.user?.id);
            
            // Test 2: Manual Profile Creation
            console.log('\n2️⃣ Testing manual profile creation...');
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    business_email: testEmail,
                    credits_remaining: 100,
                    trial_granted: true,
                    onboarding_complete: false,
                    unlimited: false,
                    subscription_status: 'inactive',
                    service_cities: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (profileError) {
                console.log('❌ Manual profile creation failed:', profileError.message);
            } else {
                console.log('✅ Manual profile creation successful!');
                console.log('Profile data:', profileData);
            }
            
            // Test 3: Signup Bonus Function
            console.log('\n3️⃣ Testing signup bonus function...');
            const { data: bonusData, error: bonusError } = await supabase.functions.invoke('grant-signup-bonus', {
                body: JSON.stringify({ user_id: data.user.id }),
            });

            if (bonusError) {
                console.log('❌ Signup bonus failed:', bonusError.message);
            } else {
                console.log('✅ Signup bonus successful!');
                console.log('Bonus result:', bonusData);
            }
            
            // Test 4: Signin
            console.log('\n4️⃣ Testing signin...');
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
    
    console.log('\n🎉 Manual test completed!');
    console.log('If you see ✅ for all tests, the emergency fix worked!');
}
