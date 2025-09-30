import React, { useEffect, useMemo } from 'react';

// Analytics service for tracking user behavior and conversions
class AnalyticsService {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.events = [];
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  setUserId(userId) {
    this.userId = userId;
  }

  // Track page views
  trackPageView(page, title) {
    const event = {
      type: 'page_view',
      page,
      title,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Track user actions
  trackAction(action, properties = {}) {
    const event = {
      type: 'action',
      action,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Track conversion events
  trackConversion(conversionType, value = null, properties = {}) {
    const event = {
      type: 'conversion',
      conversionType,
      value,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Track listing interactions
  trackListingInteraction(action, listingId, properties = {}) {
    const event = {
      type: 'listing_interaction',
      action, // 'view', 'reveal', 'export', 'filter'
      listingId,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Track authentication events
  trackAuthEvent(eventType, properties = {}) {
    const event = {
      type: 'auth_event',
      eventType, // 'signup', 'login', 'logout', 'google_signin'
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Track form interactions
  trackFormEvent(formName, eventType, properties = {}) {
    const event = {
      type: 'form_event',
      formName,
      eventType, // 'start', 'complete', 'error', 'abandon'
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Track performance metrics
  trackPerformance(metric, value, properties = {}) {
    const event = {
      type: 'performance',
      metric, // 'page_load', 'api_response', 'component_render'
      value,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.logEvent(event);
  }

  // Internal method to log events
  logEvent(event) {
    if (!this.isEnabled) {
      console.log('Analytics Event:', event);
      return;
    }

    this.events.push(event);

    // Send to analytics service (replace with your preferred service)
    this.sendToAnalytics(event);
  }

  // Send events to analytics service
  async sendToAnalytics(event) {
    try {
      // Example: Send to Google Analytics, Mixpanel, or custom endpoint
      if (typeof gtag !== 'undefined') {
        gtag('event', event.action || event.type, {
          event_category: event.type,
          event_label: event.properties?.label,
          value: event.value,
        });
      }

      // Example: Send to custom analytics endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  // Get analytics data for debugging
  getEvents() {
    return this.events;
  }

  // Clear events (useful for testing)
  clearEvents() {
    this.events = [];
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// React hook for easy use in components
export const useAnalytics = () => {
  // Use useMemo to prevent creating new function references on every render
  return useMemo(() => ({
    trackPageView: analytics.trackPageView.bind(analytics),
    trackAction: analytics.trackAction.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    trackListingInteraction: analytics.trackListingInteraction.bind(analytics),
    trackAuthEvent: analytics.trackAuthEvent.bind(analytics),
    trackFormEvent: analytics.trackFormEvent.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
  }), []); // Empty dependency array means this only runs once
};

// Higher-order component for automatic page tracking
export const withAnalytics = (WrappedComponent) => {
  return function AnalyticsWrapper(props) {
    const { trackPageView } = useAnalytics();

    useEffect(() => {
      const page = window.location.pathname;
      const title = document.title;
      trackPageView(page, title);
    }, [trackPageView]);

    return React.createElement(WrappedComponent, props);
  };
};
