// Authentication Integration Test Script
// This script can be run in the browser console to test actual authentication flows

class AuthTester {
  constructor() {
    this.supabase = window.supabase || null;
    this.testResults = [];
    this.testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logMessage);
    
    this.testResults.push({
      timestamp,
      type,
      message,
    });
  }

  async runAllTests() {
    console.log('🧪 Starting Authentication Integration Tests...\n');
    
    try {
      await this.testSupabaseConnection();
      await this.testEmailPasswordSignup();
      await this.testEmailPasswordSignin();
      await this.testGoogleOAuthInitiation();
      await this.testSessionManagement();
      await this.testErrorHandling();
      
      this.printTestSummary();
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    }
  }

  async testSupabaseConnection() {
    this.log('Testing Supabase connection...', 'info');
    
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not found. Make sure you are on a page with Supabase initialized.');
      }

      // Test basic connection
      const { data, error } = await this.supabase.auth.getUser();
      
      if (error && error.message !== 'Auth session missing!') {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      this.log('✅ Supabase connection successful', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Supabase connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testEmailPasswordSignup() {
    this.log('Testing email/password signup...', 'info');
    
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: this.testUser.email,
        password: this.testUser.password,
      });

      if (error) {
        throw new Error(`Signup failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Signup succeeded but no user returned');
      }

      this.log(`✅ Signup successful for ${this.testUser.email}`, 'success');
      this.log(`User ID: ${data.user.id}`, 'info');
      
      // Test signup bonus function
      try {
        const { error: bonusError } = await this.supabase.functions.invoke('grant-signup-bonus', {
          body: JSON.stringify({ user_id: data.user.id }),
        });

        if (bonusError) {
          this.log(`⚠️ Signup bonus failed: ${bonusError.message}`, 'warning');
        } else {
          this.log('✅ Signup bonus granted successfully', 'success');
        }
      } catch (bonusError) {
        this.log(`⚠️ Signup bonus function error: ${bonusError.message}`, 'warning');
      }

      return true;
    } catch (error) {
      this.log(`❌ Signup failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testEmailPasswordSignin() {
    this.log('Testing email/password signin...', 'info');
    
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: this.testUser.email,
        password: this.testUser.password,
      });

      if (error) {
        throw new Error(`Signin failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Signin succeeded but no user returned');
      }

      this.log(`✅ Signin successful for ${this.testUser.email}`, 'success');
      this.log(`Session active: ${!!data.session}`, 'info');
      
      return true;
    } catch (error) {
      this.log(`❌ Signin failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testGoogleOAuthInitiation() {
    this.log('Testing Google OAuth initiation...', 'info');
    
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw new Error(`Google OAuth initiation failed: ${error.message}`);
      }

      if (!data.url) {
        throw new Error('Google OAuth initiated but no URL returned');
      }

      this.log('✅ Google OAuth initiation successful', 'success');
      this.log(`OAuth URL: ${data.url}`, 'info');
      
      // Note: We don't actually redirect in the test
      this.log('ℹ️ OAuth URL generated (not redirecting in test)', 'info');
      
      return true;
    } catch (error) {
      this.log(`❌ Google OAuth initiation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testSessionManagement() {
    this.log('Testing session management...', 'info');
    
    try {
      // Test getting current user
      const { data: userData, error: userError } = await this.supabase.auth.getUser();
      
      if (userError) {
        this.log(`⚠️ No active session: ${userError.message}`, 'warning');
        return false;
      }

      if (!userData.user) {
        throw new Error('No user data returned');
      }

      this.log(`✅ Active session found for user: ${userData.user.email}`, 'success');
      
      // Test session refresh
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError) {
        this.log(`⚠️ Session retrieval failed: ${sessionError.message}`, 'warning');
      } else {
        this.log('✅ Session data retrieved successfully', 'success');
        this.log(`Session expires at: ${new Date(sessionData.session.expires_at).toISOString()}`, 'info');
      }

      return true;
    } catch (error) {
      this.log(`❌ Session management test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testErrorHandling() {
    this.log('Testing error handling...', 'info');
    
    try {
      // Test invalid credentials
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });

      if (error) {
        this.log(`✅ Invalid credentials properly rejected: ${error.message}`, 'success');
      } else {
        this.log('⚠️ Invalid credentials were accepted (unexpected)', 'warning');
      }

      // Test invalid email format
      const { data: signupData, error: signupError } = await this.supabase.auth.signUp({
        email: 'invalid-email',
        password: 'password123',
      });

      if (signupError) {
        this.log(`✅ Invalid email format properly rejected: ${signupError.message}`, 'success');
      } else {
        this.log('⚠️ Invalid email format was accepted (unexpected)', 'warning');
      }

      return true;
    } catch (error) {
      this.log(`❌ Error handling test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up test data...', 'info');
    
    try {
      // Sign out current user
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        this.log(`⚠️ Signout failed: ${error.message}`, 'warning');
      } else {
        this.log('✅ Test cleanup completed', 'success');
      }
    } catch (error) {
      this.log(`⚠️ Cleanup error: ${error.message}`, 'warning');
    }
  }

  printTestSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const successCount = this.testResults.filter(r => r.type === 'success').length;
    const errorCount = this.testResults.filter(r => r.type === 'error').length;
    const warningCount = this.testResults.filter(r => r.type === 'warning').length;
    
    console.log(`✅ Successful tests: ${successCount}`);
    console.log(`❌ Failed tests: ${errorCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`📝 Total logs: ${this.testResults.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All authentication tests passed!');
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    }
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const icon = result.type === 'success' ? '✅' : 
                   result.type === 'error' ? '❌' : 
                   result.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${result.message}`);
    });
  }

  // Helper method to test specific scenarios
  async testSpecificScenario(scenario) {
    switch (scenario) {
      case 'signup':
        return await this.testEmailPasswordSignup();
      case 'signin':
        return await this.testEmailPasswordSignin();
      case 'google':
        return await this.testGoogleOAuthInitiation();
      case 'session':
        return await this.testSessionManagement();
      default:
        this.log(`Unknown scenario: ${scenario}`, 'error');
        return false;
    }
  }
}

// Export for use in browser console
window.AuthTester = AuthTester;

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  console.log('🔧 Authentication Tester loaded. Usage:');
  console.log('  const tester = new AuthTester();');
  console.log('  await tester.runAllTests();');
  console.log('  // Or test specific scenario:');
  console.log('  await tester.testSpecificScenario("signup");');
  console.log('  await tester.cleanup();');
}

export default AuthTester;
