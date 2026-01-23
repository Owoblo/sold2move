import React from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createErrorBoundaryFallback } from '@/lib/errorHandler';

/**
 * Check if an error is a chunk loading error (happens after deployment)
 */
const isChunkLoadError = (error) => {
  const message = error?.message || '';
  return (
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    error?.name === 'ChunkLoadError'
  );
};

/**
 * Clear caches and reload the page
 */
const clearCachesAndReload = async () => {
  try {
    // Clear all caches if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (e) {
    console.debug('Failed to clear caches:', e);
  }
  // Force reload bypassing cache
  window.location.reload();
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a chunk loading error
    const chunkError = isChunkLoadError(error);
    return { hasError: true, isChunkError: chunkError };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    const errorDetails = createErrorBoundaryFallback(error, errorInfo);

    // Check if this is a chunk loading error
    if (isChunkLoadError(error)) {
      console.log('[ErrorBoundary] Chunk load error detected, auto-reloading...');
      // Auto-reload for chunk errors
      clearCachesAndReload();
      return;
    }

    this.setState({
      error: errorDetails.error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      
      return (
        <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-light-navy border-red-500/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <CardTitle className="text-2xl text-lightest-slate">
                Something went wrong
              </CardTitle>
              <p className="text-slate mt-2">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-deep-navy rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bug className="h-4 w-4 text-slate" />
                    <span className="text-sm font-medium text-slate">Development Error Details</span>
                  </div>
                  <details className="space-y-2">
                    <summary className="text-xs text-slate cursor-pointer hover:text-lightest-slate">
                      Click to view error details
                    </summary>
                    <div className="mt-2 space-y-2 text-xs font-mono text-slate">
                      <div>
                        <strong>Message:</strong> {error.message}
                      </div>
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 p-2 bg-black/20 rounded overflow-auto text-xs">
                          {error.stack}
                        </pre>
                      </div>
                      {error.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 p-2 bg-black/20 rounded overflow-auto text-xs">
                            {error.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="bg-teal text-deep-navy hover:bg-teal/90"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="border-teal text-teal hover:bg-teal/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="border-slate text-slate hover:bg-slate/10"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Help text */}
              <div className="text-center text-sm text-slate">
                <p>
                  If this problem persists, please contact support with the error details above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
