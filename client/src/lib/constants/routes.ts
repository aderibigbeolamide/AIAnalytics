/**
 * Application route constants for consistent navigation
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  LANDING: '/landing',
  
  // Authentication routes
  LOGIN: '/login',
  REGISTER: '/register',
  ORGANIZATION_LOGIN: '/organization-login',
  ORGANIZATION_REGISTER: '/organization-register',
  SUPER_ADMIN_LOGIN: '/super-admin-login',
  
  // Protected user routes
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // Event routes
  EVENTS: '/events',
  EVENT_DETAIL: (id: string) => `/events/${id}`,
  EVENT_REGISTRATION: (id: string) => `/register/${id}`,
  PUBLIC_EVENT_DETAIL: (id: string) => `/events/${id}/public`,
  MY_EVENTS: '/my-events',
  
  // Member management
  MEMBERS: '/members',
  MEMBER_DETAIL: (id: string) => `/members/${id}`,
  INVITEES: '/invitees',
  
  // Analytics and reports
  ANALYTICS: '/analytics',
  REPORTS: '/reports',
  REPORT_DETAIL: (eventId: string) => `/report/${eventId}`,
  
  // Scanner and validation
  SCANNER: '/scanner',
  TICKET_SCANNER: '/ticket-scanner',
  GUEST_LOOKUP: '/guest-lookup',
  
  // Payment routes
  BUY_TICKET: (eventId: string) => `/buy-ticket/${eventId}`,
  PAYMENT_SUCCESS: '/payment/success',
  PAYMENT_FAILED: '/payment/failed',
  PAYMENT_CALLBACK: '/payment/callback',
  
  // Ticket management
  TICKET_DETAIL: (ticketId: string) => `/ticket/${ticketId}`,
  EVENT_TICKETS: '/event-tickets',
  
  // Admin routes
  SUPER_ADMIN_DASHBOARD: '/super-admin-dashboard',
  SUPER_ADMIN_CHAT: '/super-admin-chat',
  PLATFORM_ANALYTICS: '/platform-analytics',
  ORGANIZATION_PROFILE: '/organization-profile',
  BANK_ACCOUNT_SETUP: '/bank-account-setup',
  
  // Special features
  EVENT_REMINDERS: '/event-reminders',
  FACIAL_RECOGNITION_DEMO: '/facial-recognition-demo',
  
  // Error pages
  NOT_FOUND: '/404',
} as const;

/**
 * Route metadata for navigation and breadcrumbs
 */
export const ROUTE_METADATA = {
  [ROUTES.HOME]: { title: 'Home', public: true },
  [ROUTES.LANDING]: { title: 'Welcome', public: true },
  [ROUTES.LOGIN]: { title: 'Login', public: true },
  [ROUTES.REGISTER]: { title: 'Register', public: true },
  [ROUTES.DASHBOARD]: { title: 'Dashboard', protected: true },
  [ROUTES.EVENTS]: { title: 'Events', protected: true },
  [ROUTES.MEMBERS]: { title: 'Members', protected: true },
  [ROUTES.ANALYTICS]: { title: 'Analytics', protected: true },
  [ROUTES.SCANNER]: { title: 'Scanner', protected: true },
  [ROUTES.SETTINGS]: { title: 'Settings', protected: true },
} as const;

/**
 * Helper function to check if route is public
 */
export function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    ROUTES.HOME,
    ROUTES.LANDING,
    ROUTES.LOGIN,
    ROUTES.REGISTER,
    ROUTES.ORGANIZATION_LOGIN,
    ROUTES.ORGANIZATION_REGISTER,
    ROUTES.SUPER_ADMIN_LOGIN,
    ROUTES.PAYMENT_SUCCESS,
    ROUTES.PAYMENT_FAILED,
    ROUTES.PAYMENT_CALLBACK,
    ROUTES.FACIAL_RECOGNITION_DEMO,
  ];
  
  // Check exact matches
  if (publicRoutes.includes(path as any)) {
    return true;
  }
  
  // Check dynamic routes
  if (path.startsWith('/register/') || 
      path.startsWith('/report/') ||
      path.startsWith('/buy-ticket/') ||
      path.startsWith('/ticket/')) {
    return true;
  }
  
  return false;
}

/**
 * Helper function to check if route requires authentication
 */
export function requiresAuth(path: string): boolean {
  return !isPublicRoute(path) && path !== ROUTES.NOT_FOUND;
}

/**
 * Helper function to get route title
 */
export function getRouteTitle(path: string): string {
  return ROUTE_METADATA[path as keyof typeof ROUTE_METADATA]?.title || 'EventValidate';
}