import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { HelmetProvider } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import App from '@/App';
import '@/index.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { ErrorProvider } from '@/contexts/ErrorContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <HelmetProvider>
          <ThemeProvider>
            <AuthProvider>
              <ErrorProvider>
                <App />
              </ErrorProvider>
            </AuthProvider>
          </ThemeProvider>
        </HelmetProvider>
      </SessionContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);