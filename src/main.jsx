// CRITICAL: Import React FIRST before anything else
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// Add comprehensive error logging
window.addEventListener('error', (event) => {
  console.error('🔴 Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled Promise Rejection:', event.reason);
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
);

// Register service worker for caching
registerServiceWorker();