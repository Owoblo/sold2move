// Quick Authentication Test - Run this in browser console after SQL fixes
console.log('🚀 Quick Authentication Test - Post SQL Fix');

async function quickAuthTest() {
    console.log('Testing authentication after SQL fixes...\n');
    
    // Test 1: Basic Connection
    console.log('1️⃣ Testing Supabase connection...');
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error && error.message !== 'Auth session missing!') {
            console.log('❌ Connection failed:', error.message);
            return;
        }
        console.log('✅ Supabase connection successful\n');
    } catch (err) {
        console.log('❌ Connection error:', err.message);
        return;
    }

    // Test 2: Signup with unique email
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('2️⃣ Testing signup...');
    console.log(`Email: ${testEmail}`);
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Signup failed:', error.message);
            console.log('💡 This might be expected if email confirmation is required');
        } else {
            console.log('✅ Signup successful!');
            console.log('User ID:', data.user?.id);
            console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
            
            // Test 3: Profile Creation
            console.log('\n3️⃣ Testing profile creation...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for trigger
            
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
                console.log('Trial granted:', profile.trial_granted);
            }

            // Test 4: Signup Bonus
            console.log('\n4️⃣ Testing signup bonus...');
            const { data: bonusData, error: bonusError } = await supabase.functions.invoke('grant-signup-bonus', {
                body: JSON.stringify({ user_id: data.user.id }),
            });

            if (bonusError) {
                console.log('❌ Signup bonus failed:', bonusError.message);
            } else {
                console.log('✅ Signup bonus successful!');
                console.log('Bonus result:', bonusData);
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
        console.log('❌ Signup error:', err.message);
    }

    console.log('\n🎉 Quick test completed!');
    console.log('If you see ✅ for most tests, authentication is working!');
}

// Run the test
quickAuthTest();
