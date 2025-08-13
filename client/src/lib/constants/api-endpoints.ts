/**
 * API endpoint constants for consistent URL management
 */

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    UPDATE_USERNAME: '/api/auth/username',
  },

  // Organizations
  ORGANIZATIONS: {
    REGISTER: '/api/organizations/register',
    LIST: '/api/organizations',
    BY_ID: (id: string) => `/api/organizations/${id}`,
    UPDATE: (id: string) => `/api/organizations/${id}`,
    DELETE: (id: string) => `/api/organizations/${id}`,
  },

  // Events
  EVENTS: {
    PUBLIC: '/api/events/public',
    LIST: '/api/events',
    BY_ID: (id: string) => `/api/events/${id}`,
    PUBLIC_BY_ID: (id: string) => `/api/events/${id}/public`,
    CREATE: '/api/events',
    UPDATE: (id: string) => `/api/events/${id}`,
    DELETE: (id: string) => `/api/events/${id}`,
    REGISTRATIONS: (id: string) => `/api/events/${id}/registrations`,
    STATISTICS: (id: string) => `/api/events/${id}/statistics`,
    CHECK_ELIGIBILITY: (id: string) => `/api/events/${id}/check-eligibility`,
  },

  // Registrations
  REGISTRATIONS: {
    CREATE: '/api/registrations',
    BY_ID: (id: string) => `/api/registrations/${id}`,
    UPDATE_STATUS: (id: string) => `/api/registrations/${id}/status`,
    VALIDATE_QR: '/api/registrations/validate-qr',
    VALIDATE_MANUAL: '/api/registrations/validate-manual',
    CARD: (id: string) => `/api/registrations/${id}/card`,
    BULK_UPDATE: '/api/registrations/bulk-update',
  },

  // Members
  MEMBERS: {
    LIST: '/api/members',
    BY_ID: (id: string) => `/api/members/${id}`,
    CREATE: '/api/members',
    UPDATE: (id: string) => `/api/members/${id}`,
    DELETE: (id: string) => `/api/members/${id}`,
    IMPORT: '/api/members/import',
  },

  // Payments
  PAYMENTS: {
    INITIALIZE: '/api/payment/initialize',
    VERIFY: '/api/payment/verify',
    WEBHOOK: '/api/payment/webhook',
  },

  // Tickets
  TICKETS: {
    BUY: '/api/tickets/buy',
    BY_ID: (id: string) => `/api/tickets/${id}`,
    VALIDATE: '/api/tickets/validate',
    TRANSFER: (id: string) => `/api/tickets/${id}/transfer`,
  },

  // Chat & Support
  CHAT: {
    SESSIONS: '/api/chat/sessions',
    MESSAGES: (sessionId: string) => `/api/chat/sessions/${sessionId}/messages`,
    ADMIN_STATUS: '/api/chatbot/admin-status',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
  },

  // Super Admin
  SUPER_ADMIN: {
    DASHBOARD: '/api/super-admin/dashboard',
    ORGANIZATIONS: '/api/super-admin/organizations',
    USERS: '/api/super-admin/users',
    PLATFORM_SETTINGS: '/api/super-admin/platform-settings',
    ANALYTICS: '/api/super-admin/analytics',
  },

  // File Uploads
  UPLOADS: {
    PROFILE_IMAGE: '/api/upload/profile-image',
    EVENT_IMAGE: '/api/upload/event-image',
    RECEIPT: '/api/upload/receipt',
  },
} as const;

/**
 * Helper function to build API URLs with base URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  return `${baseUrl}${endpoint}`;
}

/**
 * Query parameter builder utility
 */
export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}