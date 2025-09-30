import React from 'react';
import { analytics } from '@/services/analytics.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Enhanced error logging
    console.error("Uncaught error:", error, errorInfo);
    
    // Track error in analytics
    analytics.trackAction('error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Send to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  reportError = async (error, errorInfo) => {
    try {
      // Example: Send to error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     error: error.message,
      //     stack: error.stack,
      //     componentStack: errorInfo.componentStack,
      //     timestamp: new Date().toISOString(),
      //     userAgent: navigator.userAgent,
      //     url: window.location.href,
      //   }),
      // });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          resetErrorBoundary={this.handleRetry} 
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;