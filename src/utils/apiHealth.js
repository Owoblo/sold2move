// Simple API health endpoint for Vite/React app
// This simulates an API endpoint for health checks

import { appHealthCheck, supabaseHealthCheck, databaseHealthCheck } from './healthCheck';

/**
 * Simple health endpoint that returns JSON
 * Usage: GET /api/health or call this function directly
 */
export async function apiHealthEndpoint() {
  try {
    const [app, supabase, database] = await Promise.allSettled([
      appHealthCheck(),
      supabaseHealthCheck(),
      databaseHealthCheck()
    ]);
    
    const checks = {
      app: app.status === 'fulfilled' ? app.value : { status: 'error', error: app.reason?.message || 'Unknown error' },
      supabase: supabase.status === 'fulfilled' ? supabase.value : { status: 'error', error: supabase.reason?.message || 'Unknown error' },
      database: database.status === 'fulfilled' ? database.value : { status: 'error', error: database.reason?.message || 'Unknown error' }
    };
    
    const overall = Object.values(checks).every(check => check.status === 'healthy') 
      ? 'healthy' 
      : 'degraded';
    
    return {
      ok: overall === 'healthy',
      status: overall,
      timestamp: new Date().toISOString(),
      checks
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Simple Supabase smoke test
 * Tests basic connection and data access
 */
export async function supabaseSmokeTest() {
  try {
    const { supabase } = await import('@/lib/customSupabaseClient');
    
    // Test basic connection with a lightweight query
    const { data, error } = await supabase
      .from('runs')
      .select('id')
      .limit(1);
    
    if (error) {
      return {
        success: false,
        error: error.message,
        message: 'Supabase connection failed'
      };
    }
    
    return {
      success: true,
      message: 'Supabase connection successful',
      data: data || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Supabase smoke test failed'
    };
  }
}

// Export for easy testing
export default {
  health: apiHealthEndpoint,
  smokeTest: supabaseSmokeTest
};
