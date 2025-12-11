// Test Supabase connection and email verification setup
import { supabase, getSiteUrl } from './src/lib/customSupabaseClient.js';

console.log("🧪 Testing Supabase connection and email verification setup...");

// Test 1: Check Supabase connection
console.log("\n1️⃣ Testing Supabase connection...");
try {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.log("❌ Supabase connection error:", error.message);
  } else {
    console.log("✅ Supabase connection successful");
    console.log("   Current session:", data.session ? "Active" : "None");
  }
} catch (error) {
  console.log("❌ Supabase connection failed:", error.message);
}

// Test 2: Check site URL configuration
console.log("\n2️⃣ Testing site URL configuration...");
try {
  const siteUrl = getSiteUrl();
  console.log("✅ Site URL:", siteUrl);
  
  // Check if email redirect URL is properly formatted
  const emailRedirectUrl = `${siteUrl}/auth/callback`;
  console.log("✅ Email redirect URL:", emailRedirectUrl);
  
  if (emailRedirectUrl.includes('undefined') || emailRedirectUrl.includes('null')) {
    console.log("❌ Email redirect URL contains undefined/null values");
  } else {
    console.log("✅ Email redirect URL is properly formatted");
  }
} catch (error) {
  console.log("❌ Site URL configuration error:", error.message);
}

// Test 3: Check Supabase configuration
console.log("\n3️⃣ Testing Supabase configuration...");
try {
  const supabaseUrl = supabase.supabaseUrl;
  const supabaseKey = supabase.supabaseKey;
  
  console.log("✅ Supabase URL:", supabaseUrl ? "Configured" : "Missing");
  console.log("✅ Supabase Key:", supabaseKey ? "Configured" : "Missing");
  
  if (!supabaseUrl || !supabaseKey) {
    console.log("❌ Supabase configuration incomplete");
  } else {
    console.log("✅ Supabase configuration complete");
  }
} catch (error) {
  console.log("❌ Supabase configuration error:", error.message);
}

console.log("\n🧪 Supabase connection tests completed!");
