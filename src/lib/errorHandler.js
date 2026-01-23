import * as Sentry from '@sentry/react';

// Comprehensive Error Handling System
export class AppError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

// Error types for better categorization
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  DATABASE: 'DATABASE_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error context builder
export const buildErrorContext = (operation, params = {}) => ({
  operation,
  params,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
  url: window.location.href
});

// Enhanced error logger with Sentry integration - PRODUCTION READY
export const logError = (error, context = {}) => {
  const errorLog = {
    message: error.message,
    code: error.code || 'UNKNOWN',
    stack: error.stack,
    context: {
      ...context,
      ...error.context
    },
    timestamp: new Date().toISOString()
  };

  // Always log to console for debugging
  console.group('🚨 Error Details');
  console.error('Message:', error.message);
  console.error('Code:', error.code);
  console.error('Context:', JSON.stringify(errorLog.context, null, 2));
  console.error('Stack:', error.stack);
  console.error('Full Error Object:', error);
  console.groupEnd();

  // Send to Sentry with full context
  try {
    Sentry.withScope((scope) => {
      // Add tags for filtering in Sentry dashboard
      scope.setTag('error_code', error.code || 'UNKNOWN');
      scope.setTag('error_type', context.queryType || context.mutationType || 'general');
      scope.setTag('operation', context.operation || context.queryName || context.mutationName || 'unknown');

      // Add page URL and component info
      scope.setTag('page_url', window.location.pathname);
      scope.setTag('full_url', window.location.href);

      // Add all context as extra data for debugging
      scope.setExtras({
        ...errorLog.context,
        originalMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack,
        browserInfo: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: errorLog.timestamp
      });

      // Set error level based on severity
      if (error.code === 'COLUMN_NOT_FOUND' || error.code === 'TABLE_NOT_FOUND') {
        scope.setLevel('error');
      } else if (error.code === 'RATE_LIMITED' || error.code === 'VALIDATION_ERROR') {
        scope.setLevel('warning');
      } else if (error.code === 'AUTH_ERROR' || error.code === 'PERMISSION_ERROR') {
        scope.setLevel('warning');
      } else {
        scope.setLevel('error');
      }

      // Add fingerprint for better grouping
      if (error.code) {
        scope.setFingerprint([error.code, context.operation || 'unknown']);
      }

      // Capture the error - this sends to Sentry
      Sentry.captureException(error);
      console.log('📤 Error sent to Sentry');
    });
  } catch (sentryError) {
    // If Sentry fails, at least log it
    console.error('Failed to send error to Sentry:', sentryError);
  }

  return errorLog;
};

// Database error handler
export const handleDatabaseError = (error, operation, context = {}) => {
  const errorContext = buildErrorContext(operation, context);
  
  // Parse Supabase error details
  let errorMessage = error.message;
  let errorCode = ERROR_TYPES.DATABASE;
  
  if (error.code) {
    switch (error.code) {
      case '42703':
        errorMessage = `Database column error: ${error.message}. This usually means a column name mismatch.`;
        errorCode = 'COLUMN_NOT_FOUND';
        break;
      case '42P01':
        errorMessage = `Database table error: ${error.message}. The table might not exist.`;
        errorCode = 'TABLE_NOT_FOUND';
        break;
      case '23505':
        errorMessage = `Duplicate entry error: ${error.message}`;
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case '23503':
        errorMessage = `Foreign key constraint error: ${error.message}`;
        errorCode = 'FOREIGN_KEY_VIOLATION';
        break;
      case 'PGRST116':
        errorMessage = `PostgREST error: ${error.message}. Check your query parameters.`;
        errorCode = 'POSTGREST_ERROR';
        break;
      default:
        errorMessage = `Database error (${error.code}): ${error.message}`;
    }
  }

  const appError = new AppError(errorMessage, errorCode, {
    ...errorContext,
    originalError: error,
    supabaseCode: error.code,
    hint: error.hint
  });

  return logError(appError, errorContext);
};

// Network error handler
export const handleNetworkError = (error, operation, context = {}) => {
  const errorContext = buildErrorContext(operation, context);
  
  let errorMessage = error.message;
  let errorCode = ERROR_TYPES.NETWORK;
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    errorMessage = 'Network connection failed. Please check your internet connection.';
    errorCode = 'CONNECTION_FAILED';
  } else if (error.status) {
    switch (error.status) {
      case 400:
        errorMessage = 'Bad request. Please check your input parameters.';
        errorCode = 'BAD_REQUEST';
        break;
      case 401:
        errorMessage = 'Authentication required. Please log in again.';
        errorCode = 'UNAUTHORIZED';
        break;
      case 403:
        errorMessage = 'Access denied. You don\'t have permission to perform this action.';
        errorCode = 'FORBIDDEN';
        break;
      case 404:
        errorMessage = 'Resource not found. The requested data may have been moved or deleted.';
        errorCode = 'NOT_FOUND';
        break;
      case 429:
        errorMessage = 'Too many requests. Please wait a moment and try again.';
        errorCode = 'RATE_LIMITED';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        errorCode = 'SERVER_ERROR';
        break;
      default:
        errorMessage = `Network error (${error.status}): ${error.message}`;
    }
  }

  const appError = new AppError(errorMessage, errorCode, {
    ...errorContext,
    originalError: error,
    status: error.status,
    statusText: error.statusText
  });

  return logError(appError, errorContext);
};

// Query error handler
export const handleQueryError = (error, queryName, params = {}) => {
  const context = {
    queryName,
    params,
    queryType: 'React Query'
  };

  if (error.code && error.code.startsWith('PGRST')) {
    return handleDatabaseError(error, `Query: ${queryName}`, context);
  } else if (error.status || error.name === 'TypeError') {
    return handleNetworkError(error, `Query: ${queryName}`, context);
  } else {
    const appError = new AppError(
      `Query error in ${queryName}: ${error.message}`,
      'QUERY_ERROR',
      { ...context, originalError: error }
    );
    return logError(appError, context);
  }
};

// Mutation error handler
export const handleMutationError = (error, mutationName, variables = {}) => {
  const context = {
    mutationName,
    variables,
    mutationType: 'React Query Mutation'
  };

  if (error.code && error.code.startsWith('PGRST')) {
    return handleDatabaseError(error, `Mutation: ${mutationName}`, context);
  } else if (error.status || error.name === 'TypeError') {
    return handleNetworkError(error, `Mutation: ${mutationName}`, context);
  } else {
    const appError = new AppError(
      `Mutation error in ${mutationName}: ${error.message}`,
      'MUTATION_ERROR',
      { ...context, originalError: error }
    );
    return logError(appError, context);
  }
};

// User-friendly error messages
export const getUserFriendlyMessage = (error) => {
  if (error.code === 'COLUMN_NOT_FOUND') {
    return 'There\'s a data structure issue. Our team has been notified and will fix this shortly.';
  }
  
  if (error.code === 'TABLE_NOT_FOUND') {
    return 'The data source is temporarily unavailable. Please try again in a few minutes.';
  }
  
  if (error.code === 'CONNECTION_FAILED') {
    return 'Unable to connect to our servers. Please check your internet connection and try again.';
  }
  
  if (error.code === 'RATE_LIMITED') {
    return 'You\'re making requests too quickly. Please wait a moment before trying again.';
  }
  
  if (error.code === 'INSUFFICIENT_CREDITS') {
    return 'You don\'t have enough credits to perform this action. Please purchase more credits or upgrade your plan.';
  }
  
  // Default fallback
  return error.message || 'An unexpected error occurred. Please try again.';
};

// Error boundary helper
export const createErrorBoundaryFallback = (error, errorInfo) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString()
  };

  logError(error, { errorInfo });

  return {
    hasError: true,
    error: errorLog,
    retry: () => window.location.reload()
  };
};

// Retry logic with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Health check error handler
export const handleHealthCheckError = (error, service) => {
  const context = {
    service,
    healthCheck: true,
    timestamp: new Date().toISOString()
  };

  const appError = new AppError(
    `Health check failed for ${service}: ${error.message}`,
    'HEALTH_CHECK_FAILED',
    { ...context, originalError: error }
  );

  return logError(appError, context);
};

// Set user context in Sentry when user logs in
export const setSentryUser = (user) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.full_name || user.email?.split('@')[0]
    });
  } else {
    // Clear user on logout
    Sentry.setUser(null);
  }
};

// Add breadcrumb for tracking user actions
export const addSentryBreadcrumb = (message, category = 'user-action', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data
  });
};

// Capture a message (non-error) to Sentry
export const captureSentryMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setExtras(context);
    Sentry.captureMessage(message);
  });
};
