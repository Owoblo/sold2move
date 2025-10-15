import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

// Get site URL from environment or fallback to current origin
export const getSiteUrl = () => {
  // Use environment variable if available
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL;
  }
  
  // For mobile devices and PWAs, ensure we use the correct origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log('🔍 getSiteUrl: Determining site URL', {
      origin,
      isMobile,
      userAgent: navigator.userAgent,
      envSiteUrl: import.meta.env.VITE_SITE_URL
    });
    
    // Handle mobile-specific cases
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('🔍 Development environment detected');
      return origin; // Development
    }
    
    // Production - ensure we use the correct domain
    if (origin.includes('sold2move.com')) {
      console.log('🔍 Production environment detected');
      return 'https://sold2move.com';
    }
    
    // For mobile devices, be more permissive with origins
    if (isMobile) {
      console.log('🔍 Mobile device detected, using current origin');
      return origin;
    }
    
    // Fallback to current origin
    console.log('🔍 Using fallback origin');
    return origin;
  }
  
  // Server-side fallback
  return 'https://sold2move.com';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);