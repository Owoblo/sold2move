// Check if Supabase is available and initialize if needed
console.log('🔍 Checking Supabase availability...');

// Check different ways Supabase might be available
const supabaseChecks = [
    () => window.supabase,
    () => window.supabaseClient,
    () => window.supabase?.supabaseClient,
    () => document.querySelector('script[src*="supabase"]'),
    () => window.__SUPABASE_URL__,
    () => window.__SUPABASE_ANON_KEY__
];

let supabaseClient = null;
let supabaseUrl = null;
let supabaseKey = null;

// Try to find existing Supabase client
for (const check of supabaseChecks) {
    try {
        const result = check();
        if (result) {
            console.log('✅ Found Supabase reference:', typeof result);
            if (typeof result === 'object' && result.auth) {
                supabaseClient = result;
                break;
            }
        }
    } catch (e) {
        // Continue checking
    }
}

// If no client found, try to create one
if (!supabaseClient) {
    console.log('⚠️ No Supabase client found. Attempting to create one...');
    
    // Try to get URL and key from environment or page
    supabaseUrl = window.__SUPABASE_URL__ || 
                  window.location.origin.includes('localhost') ? 'https://idbyrtwdeeruiutoukct.supabase.co' : 
                  'https://idbyrtwdeeruiutoukct.supabase.co';
    
    // Try to find the anon key
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        const content = script.textContent || script.innerHTML;
        if (content.includes('supabase') && content.includes('anon')) {
            const keyMatch = content.match(/anon[^"']*["']([^"']+)["']/);
            if (keyMatch) {
                supabaseKey = keyMatch[1];
                break;
            }
        }
    }
    
    if (supabaseUrl && supabaseKey) {
        console.log('🔧 Creating Supabase client...');
        try {
            // Import and create client
            import('https://cdn.skypack.dev/@supabase/supabase-js@2').then(({ createClient }) => {
                supabaseClient = createClient(supabaseUrl, supabaseKey);
                window.supabase = supabaseClient;
                console.log('✅ Supabase client created successfully!');
                console.log('You can now run the authentication tests.');
                
                // Auto-run a quick test
                testSupabaseConnection();
            }).catch(err => {
                console.log('❌ Failed to import Supabase:', err.message);
                console.log('Please provide your Supabase credentials manually.');
            });
        } catch (err) {
            console.log('❌ Failed to create Supabase client:', err.message);
        }
    } else {
        console.log('❌ Could not find Supabase URL or key automatically.');
        console.log('Please provide them manually:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Copy your project URL and anon key');
        console.log('3. Run: createSupabaseClient("YOUR_URL", "YOUR_KEY")');
    }
} else {
    console.log('✅ Supabase client is available!');
    window.supabase = supabaseClient;
    testSupabaseConnection();
}

// Function to manually create Supabase client
window.createSupabaseClient = function(url, key) {
    console.log('🔧 Creating Supabase client manually...');
    import('https://cdn.skypack.dev/@supabase/supabase-js@2').then(({ createClient }) => {
        supabaseClient = createClient(url, key);
        window.supabase = supabaseClient;
        console.log('✅ Supabase client created successfully!');
        testSupabaseConnection();
    }).catch(err => {
        console.log('❌ Failed to create Supabase client:', err.message);
    });
};

// Test connection
async function testSupabaseConnection() {
    if (!supabaseClient) {
        console.log('❌ No Supabase client available');
        return;
    }
    
    console.log('🧪 Testing Supabase connection...');
    try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error && error.message !== 'Auth session missing!') {
            console.log('❌ Connection test failed:', error.message);
        } else {
            console.log('✅ Supabase connection successful!');
            console.log('Ready to run authentication tests.');
        }
    } catch (err) {
        console.log('❌ Connection test error:', err.message);
    }
}

console.log('📋 Next steps:');
console.log('1. If Supabase client was created, you can now run authentication tests');
console.log('2. If not, run: createSupabaseClient("YOUR_URL", "YOUR_KEY")');
console.log('3. Then run: debugAuthIssues()');
