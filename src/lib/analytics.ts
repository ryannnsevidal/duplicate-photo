// Analytics integration for production monitoring
interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  user_id?: string;
}

class Analytics {
  private isProduction = process.env.NODE_ENV === 'production';
  private userId: string | null = null;

  // Initialize analytics (Google Analytics, Mixpanel, etc.)
  initialize(userId?: string) {
    this.userId = userId || null;
    
    if (this.isProduction) {
      // TODO: Initialize your analytics service
      // Example for Google Analytics:
      // gtag('config', 'GA_MEASUREMENT_ID', { user_id: userId });
      
      // Example for Mixpanel:
      // mixpanel.init('YOUR_PROJECT_TOKEN');
      // if (userId) mixpanel.identify(userId);
      
      console.log('Analytics initialized for production');
    }
  }

  // Track page views
  trackPageView(path: string, title?: string) {
    const event = {
      event: 'page_view',
      properties: {
        page_path: path,
        page_title: title || document.title,
        timestamp: new Date().toISOString(),
      },
      user_id: this.userId,
    };

    this.sendEvent(event);
  }

  // Track user actions
  trackEvent(eventName: string, properties?: Record<string, any>) {
    const event = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
      user_id: this.userId,
    };

    this.sendEvent(event);
  }

  // Track security events
  trackSecurityEvent(action: string, success: boolean, metadata?: Record<string, any>) {
    this.trackEvent('security_event', {
      action,
      success,
      ...metadata,
    });
  }

  // Track file upload events
  trackFileUpload(fileType: string, fileSize: number, hasDuplicates: boolean) {
    this.trackEvent('file_upload', {
      file_type: fileType,
      file_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100,
      has_duplicates: hasDuplicates,
    });
  }

  // Track admin actions
  trackAdminAction(action: string, resource?: string) {
    this.trackEvent('admin_action', {
      action,
      resource,
    });
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    if (this.isProduction) {
      // TODO: Update user properties in your analytics service
      // Example: mixpanel.people.set(properties);
    }
    
    console.log('User properties set:', properties);
  }

  // Private method to send events
  private sendEvent(event: AnalyticsEvent) {
    if (this.isProduction) {
      // TODO: Send to your analytics service
      // Example for Google Analytics:
      // gtag('event', event.event, event.properties);
      
      // Example for Mixpanel:
      // mixpanel.track(event.event, event.properties);
      
      // Example for custom analytics:
      // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) });
    }
    
    // Always log in development
    console.log('Analytics Event:', event);
  }
}

// Export singleton instance
export const analytics = new Analytics();