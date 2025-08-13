import * as Sentry from "@sentry/react";

// Initialize Sentry for production error tracking
export const initializeMonitoring = () => {
  if (process.env.NODE_ENV === 'production') {
    // Note: Sentry DSN should be configured as a Supabase secret for production
    const sentryDsn = process.env.SENTRY_DSN;
    if (!sentryDsn) {
      console.warn('Sentry DSN not configured. Error tracking disabled.');
      return;
    }
    
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
      beforeSend(event) {
        // Filter out non-critical errors in production
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.type === 'ChunkLoadError' || error?.type === 'NetworkError') {
            return null; // Don't send chunk load errors or basic network errors
          }
        }
        return event;
      },
    });
  }
};

// Capture custom events for business metrics
export const trackEvent = (eventName: string, data?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message: eventName,
      level: 'info',
      data,
    });
  }
  console.log(`Event: ${eventName}`, data);
};

// Track security events
export const trackSecurityEvent = (action: string, metadata?: Record<string, any>) => {
  const event = {
    action,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message: `Security: ${action}`,
      level: 'warning',
      data: event,
      category: 'security',
    });
  }
  
  console.warn('Security Event:', event);
};

// Track performance metrics
export const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message: `Performance: ${metric}`,
      level: 'info',
      data: { value, unit },
      category: 'performance',
    });
  }
  
  console.log(`Performance: ${metric} = ${value}${unit}`);
};

export { Sentry };