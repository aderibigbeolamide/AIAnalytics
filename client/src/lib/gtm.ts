// Google Tag Manager utility functions
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize GTM dataLayer if not already present
export const initGTM = () => {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = window.dataLayer || [];
  }
};

// Track page views for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'page_view',
    page_path: url,
    page_title: document.title
  });
};

// Track custom events
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: eventName,
    ...parameters
  });
};

// Track user login
export const trackLogin = (method: string = 'form') => {
  trackEvent('login', { method });
};

// Track user logout
export const trackLogout = () => {
  trackEvent('logout');
};

// Track event creation
export const trackEventCreation = (eventType: string) => {
  trackEvent('event_created', { 
    event_category: 'admin_action',
    event_type: eventType 
  });
};

// Track QR code scan
export const trackQRScan = (success: boolean) => {
  trackEvent('qr_scan', {
    event_category: 'validation',
    scan_success: success
  });
};

// Track member registration
export const trackMemberRegistration = (eventId: string, registrationType: string) => {
  trackEvent('member_registration', {
    event_category: 'registration',
    event_id: eventId,
    registration_type: registrationType
  });
};

// Track report submission
export const trackReportSubmission = (eventId: string) => {
  trackEvent('report_submission', {
    event_category: 'feedback',
    event_id: eventId
  });
};