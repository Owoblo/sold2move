// Comprehensive authentication debugging utility

export const debugAuthFlow = (step, data = {}) => {
  const timestamp = new Date().toISOString();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log(`🔍 [${timestamp}] AUTH DEBUG - ${step}:`, {
    ...data,
    isMobile,
    userAgent: navigator.userAgent,
    currentUrl: window.location.href,
    localStorage: {
      intendedDestination: localStorage.getItem('intendedDestination'),
      supabaseAuthToken: localStorage.getItem('sb-idbyrtwdeeruiutoukct-auth-token')
    }
  });
};

export const debugSupabaseError = (error, context = '') => {
  console.error(`❌ SUPABASE ERROR [${context}]:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status,
    statusText: error.statusText,
    fullError: error
  });
};

export const debugUserState = (user, context = '') => {
  console.log(`👤 USER STATE [${context}]:`, {
    id: user?.id,
    email: user?.email,
    emailConfirmed: user?.email_confirmed_at,
    createdAt: user?.created_at,
    lastSignIn: user?.last_sign_in_at,
    providers: user?.app_metadata?.providers,
    fullUser: user
  });
};

export const debugSessionState = (session, context = '') => {
  console.log(`🔐 SESSION STATE [${context}]:`, {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    accessToken: session?.access_token ? 'present' : 'missing',
    refreshToken: session?.refresh_token ? 'present' : 'missing',
    expiresAt: session?.expires_at,
    tokenType: session?.token_type,
    provider: session?.user?.app_metadata?.provider
  });
};

export const debugProfileState = (profile, context = '') => {
  console.log(`📋 PROFILE STATE [${context}]:`, {
    hasProfile: !!profile,
    profileId: profile?.id,
    businessEmail: profile?.business_email,
    onboardingComplete: profile?.onboarding_complete,
    creditsRemaining: profile?.credits_remaining,
    trialGranted: profile?.trial_granted,
    subscriptionStatus: profile?.subscription_status,
    fullProfile: profile
  });
};

export const debugNavigationFlow = (from, to, reason = '') => {
  console.log(`🧭 NAVIGATION [${reason}]:`, {
    from,
    to,
    currentPath: window.location.pathname,
    currentSearch: window.location.search,
    intendedDestination: localStorage.getItem('intendedDestination')
  });
};

export const debugAuthCallback = (urlParams, context = '') => {
  console.log(`🔄 AUTH CALLBACK [${context}]:`, {
    code: urlParams.get('code') ? 'present' : 'missing',
    error: urlParams.get('error'),
    errorDescription: urlParams.get('error_description'),
    state: urlParams.get('state'),
    fullUrl: window.location.href,
    fullSearch: window.location.search
  });
};

export const debugDatabaseOperation = (operation, table, data, error = null) => {
  console.log(`🗄️ DATABASE [${operation}] ${table}:`, {
    operation,
    table,
    data: data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : data) : 'none',
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    } : 'none'
  });
};

// Test function to validate the complete auth flow
export const testAuthFlow = async (supabase) => {
  console.log('🧪 TESTING COMPLETE AUTH FLOW...');
  
  try {
    // Test 1: Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    debugSessionState(session, 'Current Session');
    if (sessionError) debugSupabaseError(sessionError, 'Get Session');
    
    // Test 2: Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    debugUserState(user, 'Current User');
    if (userError) debugSupabaseError(userError, 'Get User');
    
    // Test 3: Check profile if user exists
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      debugProfileState(profile, 'Current Profile');
      if (profileError) debugSupabaseError(profileError, 'Get Profile');
    }
    
    // Test 4: Check environment
    console.log('🌍 ENVIRONMENT:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'set' : 'missing',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'missing',
      siteUrl: import.meta.env.VITE_SITE_URL ? 'set' : 'missing',
      nodeEnv: import.meta.env.NODE_ENV,
      mode: import.meta.env.MODE
    });
    
    console.log('✅ AUTH FLOW TEST COMPLETED');
    
  } catch (error) {
    console.error('❌ AUTH FLOW TEST FAILED:', error);
  }
};
