import { useEffect } from 'react';
import { trackEvent, trackSecurityEvent, trackPerformance } from '@/lib/monitoring';
import { analytics } from '@/lib/analytics';

export function useMonitoring() {
  useEffect(() => {
    // Track page performance
    const measurePerformance = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            trackPerformance('page_load_time', loadTime);
            
            // Track Core Web Vitals if available
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (entry.entryType === 'navigation') {
                    const navEntry = entry as PerformanceNavigationTiming;
                    trackPerformance('first_contentful_paint', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
                  }
                }
              });
              observer.observe({ entryTypes: ['navigation'] });
            }
          }, 0);
        });
      }
    };

    measurePerformance();
  }, []);

  const trackUserAction = (action: string, metadata?: Record<string, any>) => {
    trackEvent(action, metadata);
    analytics.trackEvent(action, metadata);
  };

  const trackSecurityAction = (action: string, success: boolean, metadata?: Record<string, any>) => {
    trackSecurityEvent(action, { success, ...metadata });
    analytics.trackSecurityEvent(action, success, metadata);
  };

  const trackFileUpload = (fileType: string, fileSize: number, hasDuplicates: boolean) => {
    const event = 'file_upload';
    const metadata = { fileType, fileSize, hasDuplicates };
    
    trackEvent(event, metadata);
    analytics.trackFileUpload(fileType, fileSize, hasDuplicates);
  };

  return {
    trackUserAction,
    trackSecurityAction,
    trackFileUpload,
  };
}