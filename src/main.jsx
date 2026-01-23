// CRITICAL: Import React FIRST before anything else
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';

// Determine if we're in production
const isProduction = window.location.hostname !== 'localhost' &&
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('localhost');

// Initialize Sentry - PRODUCTION READY
Sentry.init({
  dsn: "https://9d2effdb593d85825cfbc9b0197d9520@o4510756974362624.ingest.us.sentry.io/4510756980981760",

  // Environment detection
  environment: isProduction ? 'production' : 'development',

  // CAPTURE 100% OF ALL ERRORS IN PRODUCTION
  sampleRate: 1.0,

  // Enable in both environments so we can test, but filter in beforeSend
  enabled: true,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Capture 10% of all sessions for replay
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Performance monitoring - capture 100% of transactions in production
  tracesSampleRate: isProduction ? 0.1 : 0,

  // Session replay - capture sessions with errors
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: isProduction ? 1.0 : 0,

  // Add context
  initialScope: {
    tags: {
      app: 'sold2move',
      version: '1.0.0'
    }
  },

  // Configure which errors to capture
  beforeSend(event, hint) {
    // In development, log but don't send
    if (!isProduction) {
      console.log('🔍 [Sentry Dev] Would capture:', {
        message: event.message || hint?.originalException?.message,
        type: event.exception?.values?.[0]?.type,
        url: event.request?.url
      });
      return null; // Don't send in development
    }

    // In production, send EVERYTHING
    console.log('📤 [Sentry] Sending error to dashboard');
    return event;
  },

  // Only ignore truly non-actionable browser noise
  ignoreErrors: [
    // Browser extension errors
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // ResizeObserver is genuinely noise
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
  ],

  // Don't ignore errors from these URLs
  denyUrls: [
    // Ignore errors from browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
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