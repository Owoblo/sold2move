// CRITICAL: Import React FIRST before anything else
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';

// Initialize Sentry as early as possible
Sentry.init({
  dsn: "https://9d2effdb593d85825cfbc9b0197d9520@o4510756974362624.ingest.us.sentry.io/4510756980981760",

  // Set environment based on hostname
  environment: window.location.hostname === 'localhost' ? 'development' : 'production',

  // Only send errors in production (set to 1.0 to capture 100% of errors)
  sampleRate: window.location.hostname === 'localhost' ? 0 : 1.0,

  // Enable debug mode in development
  debug: window.location.hostname === 'localhost',

  // Configure which errors to capture
  beforeSend(event, hint) {
    // Don't send errors in development
    if (window.location.hostname === 'localhost') {
      console.log('🔍 Sentry would capture (dev mode):', event);
      return null;
    }
    return event;
  },

  // Add user context when available
  initialScope: {
    tags: {
      app: 'sold2move',
      version: '1.0.0'
    }
  },

  // Ignore common non-actionable errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],
});

// Add comprehensive error logging
window.addEventListener('error', (event) => {
  console.error('🔴 Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  });
  // Sentry will automatically capture this
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled Promise Rejection:', event.reason);
  // Sentry will automatically capture this
});

// Verify React loaded correctly
if (typeof React === 'undefined' || !React.createContext) {
  console.error('🔴 CRITICAL: React failed to load or is incomplete!', { React });
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: system-ui; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #ef4444;">React Loading Error</h1>
      <p>React failed to load properly. This is usually caused by:</p>
      <ul>
        <li>CSP blocking React bundle</li>
        <li>Network error loading React</li>
        <li>Module load order issue</li>
      </ul>
      <p><strong>React object:</strong> ${typeof React}</p>
      <p><strong>React.createContext:</strong> ${typeof React?.createContext}</p>
      <button onclick="location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
    </div>
  `;
  throw new Error('React failed to load');
}

console.log('✅ React loaded successfully', {
  version: React.version,
  hasCreateContext: !!React.createContext,
  hasUseState: !!React.useState
});

import { BrowserRouter } from 'react-router-dom';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { HelmetProvider } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import App from '@/App';
import InitialLoader from '@/components/ui/InitialLoader';
import '@/index.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { ErrorProvider } from '@/contexts/ErrorContext';
import { QueryProvider } from '@/providers/QueryProvider';
import { registerServiceWorker } from '@/utils/serviceWorker';

// Sentry fallback component for critical errors
const SentryFallback = ({ error, resetError }) => (
  <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
    <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>Something went wrong</h1>
    <p style={{ color: '#6b7280', marginBottom: '24px' }}>
      We've been notified and are working to fix the issue.
    </p>
    <button
      onClick={resetError}
      style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '12px' }}
    >
      Try Again
    </button>
    <button
      onClick={() => window.location.href = '/dashboard'}
      style={{ padding: '12px 24px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
    >
      Go to Dashboard
    </button>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={SentryFallback} showDialog>
      <Suspense fallback={<InitialLoader />}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SessionContextProvider supabaseClient={supabase}>
            <QueryProvider>
              <HelmetProvider>
                <ThemeProvider>
                  <AuthProvider>
                    <ErrorProvider>
                      <App />
                    </ErrorProvider>
                  </AuthProvider>
                </ThemeProvider>
              </HelmetProvider>
            </QueryProvider>
          </SessionContextProvider>
        </BrowserRouter>
      </Suspense>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for caching
registerServiceWorker();