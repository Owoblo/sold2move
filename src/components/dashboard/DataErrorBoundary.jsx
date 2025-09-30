import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

class DataErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Data Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Track error for analytics
    if (window.analytics) {
      window.analytics.trackError(error, {
        component: 'DataErrorBoundary',
        errorInfo: errorInfo.componentStack,
        retryCount: this.state.retryCount
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const maxRetries = 3;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-md bg-light-navy border-red-500/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-xl text-lightest-slate">
                Data Loading Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate">
                {retryCount >= maxRetries 
                  ? "We're experiencing technical difficulties. Please try again later."
                  : "Something went wrong while loading the data. This might be a temporary issue."
                }
              </p>
              
              {retryCount < maxRetries && (
                <div className="space-y-2">
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full bg-green text-deep-navy hover:bg-green/90"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({retryCount + 1}/{maxRetries})
                  </Button>
                </div>
              )}
              
              <div className="space-y-2">
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/dashboard/settings">
                    Contact Support
                  </Link>
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-slate hover:text-lightest-slate">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DataErrorBoundary;
