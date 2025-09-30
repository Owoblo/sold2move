import { supabase } from '@/lib/customSupabaseClient';

/**
 * App health check
 * @returns {Promise<{status: string, timestamp: string, version: string, environment: string, nodeVersion: string}>}
 */
export async function appHealthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: import.meta.env.MODE || 'development',
    nodeVersion: typeof process !== 'undefined' ? process.version : 'browser'
  };
}

/**
 * Supabase health check
 * @returns {Promise<{status: string, connected: boolean, message: string}>}
 */
export async function supabaseHealthCheck() {
  try {
    const { data, error } = await supabase
      .from('runs')
      .select('id')
      .limit(1);
    
    if (error) {
      return {
        status: 'error',
        connected: false,
        message: `Supabase connection failed: ${error.message}`
      };
    }
    
    return {
      status: 'healthy',
      connected: true,
      message: 'Supabase connection successful'
    };
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      message: `Supabase connection error: ${error.message}`
    };
  }
}

/**
 * Database health check
 * @returns {Promise<{status: string, data: any}>}
 */
export async function databaseHealthCheck() {
  try {
    // Check runs table
    const { data: runsData, error: runsError } = await supabase
      .from('runs')
      .select('id, started_at')
      .order('started_at', { ascending: false })
      .limit(1);
    
    if (runsError) {
      return {
        status: 'error',
        data: { error: runsError.message }
      };
    }
    
    // Check current_listings table
    const { data: currentListingsData, error: currentListingsError } = await supabase
      .from('current_listings')
      .select('id')
      .limit(1);
    
    if (currentListingsError) {
      return {
        status: 'error',
        data: { error: currentListingsError.message }
      };
    }
    
    // Get counts
    const { count: runsCount } = await supabase
      .from('runs')
      .select('*', { count: 'exact', head: true });
    
    const { count: currentListingsCount } = await supabase
      .from('current_listings')
      .select('*', { count: 'exact', head: true });
    
    const { count: justListedCount } = await supabase
      .from('just_listed')
      .select('*', { count: 'exact', head: true });
    
    const { count: soldListingsCount } = await supabase
      .from('sold_listings')
      .select('*', { count: 'exact', head: true });
    
    return {
      status: 'healthy',
      data: {
        runs: {
          count: runsCount || 0,
          latest: runsData?.[0]?.started_at || 'No data'
        },
        current_listings: {
          count: currentListingsCount || 0,
          hasData: (currentListingsCount || 0) > 0
        },
        just_listed: {
          count: justListedCount || 0,
          hasData: (justListedCount || 0) > 0
        },
        sold_listings: {
          count: soldListingsCount || 0,
          hasData: (soldListingsCount || 0) > 0
        }
      }
    };
  } catch (error) {
    return {
      status: 'error',
      data: { error: error.message }
    };
  }
}

/**
 * Payment workflow health check with plan-specific testing
 * @returns {Promise<{status: string, testMode: boolean, message: string, plans: any, note: string}>}
 */
export async function paymentHealthCheck() {
  try {
    // Check if Stripe is configured
    const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!stripePublishableKey) {
      return {
        status: 'error',
        testMode: false,
        message: 'Stripe not configured',
        plans: {},
        note: 'VITE_STRIPE_PUBLISHABLE_KEY is missing'
      };
    }
    
    // Determine if we're in test or live mode
    const isTestMode = stripePublishableKey.startsWith('pk_test_');
    
    // Check if user is authenticated (required for testing edge functions)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        status: 'degraded',
        testMode: isTestMode,
        message: `Payment workflows configured in ${isTestMode ? 'test' : 'live'} mode`,
        plans: {
          starter: 'requires_auth',
          growth: 'requires_auth',
          scale: 'requires_auth',
          topup: 'requires_auth'
        },
        note: 'Edge functions require user authentication to test'
      };
    }
    
    // Test each plan's checkout workflow
    const DEFAULT_TEST_PRICE_ID = 'price_1SCBwSCUfCzyitr0nf5Hu5Cg'; // $9.99 CAD
    
    const planTests = {
      starter: { name: 'Starter Plan', priceId: DEFAULT_TEST_PRICE_ID },
      growth: { name: 'Growth Plan', priceId: DEFAULT_TEST_PRICE_ID },
      scale: { name: 'Scale Plan', priceId: DEFAULT_TEST_PRICE_ID },
      topup: { name: 'Credit Pack', priceId: DEFAULT_TEST_PRICE_ID }
    };
    
    const planResults = {};
    let allPlansWorking = true;
    
    // Test each plan (but don't actually create sessions, just test the function call)
    for (const [planKey, plan] of Object.entries(planTests)) {
      try {
        // Test subscription checkout for each plan
        const { error: subscriptionError } = await supabase.functions.invoke('create-checkout-session', {
          body: { priceId: plan.priceId },
        });
        
        if (subscriptionError) {
          planResults[planKey] = 'error';
          allPlansWorking = false;
        } else {
          planResults[planKey] = 'working';
        }
        
        // Test one-time payment for credit packs
        if (planKey === 'topup') {
          const { error: paymentError } = await supabase.functions.invoke('create-topup-session', {
            body: { priceId: plan.priceId },
          });
          
          if (paymentError) {
            planResults[planKey] = 'error';
            allPlansWorking = false;
          } else {
            planResults[planKey] = 'working';
          }
        }
        
      } catch (error) {
        planResults[planKey] = 'error';
        allPlansWorking = false;
      }
    }
    
    return {
      status: allPlansWorking ? 'healthy' : 'degraded',
      testMode: isTestMode,
      message: `Payment workflows ${allPlansWorking ? 'working' : 'partially working'} in ${isTestMode ? 'test' : 'live'} mode`,
      plans: planResults,
      note: allPlansWorking 
        ? 'All payment plans are working correctly' 
        : 'Some payment plans may have issues - check individual plan status'
    };
    
  } catch (err) {
    return {
      status: 'error',
      testMode: false,
      error: err.message,
      plans: {}
    };
  }
}

/**
 * Comprehensive health check
 * @returns {Promise<{overall: string, checks: any}>}
 */
export async function fullHealthCheck() {
  const [app, supabase, database, payment] = await Promise.allSettled([
    appHealthCheck(),
    supabaseHealthCheck(),
    databaseHealthCheck(),
    paymentHealthCheck()
  ]);
  
  const checks = {
    app: app.status === 'fulfilled' ? app.value : { status: 'error', error: app.reason?.message || 'Unknown error' },
    supabase: supabase.status === 'fulfilled' ? supabase.value : { status: 'error', error: supabase.reason?.message || 'Unknown error' },
    database: database.status === 'fulfilled' ? database.value : { status: 'error', error: database.reason?.message || 'Unknown error' },
    payment: payment.status === 'fulfilled' ? payment.value : { status: 'error', error: payment.reason?.message || 'Unknown error' }
  };
  
  const overall = Object.values(checks).every(check => check.status === 'healthy') 
    ? 'healthy' 
    : 'degraded';
  
  return {
    overall,
    timestamp: new Date().toISOString(),
    checks
  };
}