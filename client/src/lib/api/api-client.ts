/**
 * API client for making HTTP requests with consistent error handling
 */

import { API_ENDPOINTS, buildApiUrl, buildQueryParams } from '../constants/api-endpoints';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

export interface ApiError {
  message: string;
  status: number;
  errors?: any[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = buildApiUrl(endpoint);
    
    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error: ApiError = {
          message: data?.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          errors: data?.errors,
        };
        throw error;
      }

      return data;
    } catch (error: any) {
      // Network or other errors
      if (!error.status) {
        throw {
          message: 'Network error. Please check your connection.',
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${endpoint}${buildQueryParams(params)}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload method
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience methods for common API operations
export const api = {
  // Authentication
  auth: {
    login: (credentials: { username: string; password: string }) =>
      apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials),
    
    getMe: () =>
      apiClient.get(API_ENDPOINTS.AUTH.ME),
    
    updateUsername: (data: { username: string; currentPassword: string }) =>
      apiClient.patch(API_ENDPOINTS.AUTH.UPDATE_USERNAME, data),
  },

  // Organizations
  organizations: {
    register: (data: any) =>
      apiClient.post(API_ENDPOINTS.ORGANIZATIONS.REGISTER, data),
    
    list: (params?: any) =>
      apiClient.get(API_ENDPOINTS.ORGANIZATIONS.LIST, params),
    
    getById: (id: string) =>
      apiClient.get(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id)),
    
    update: (id: string, data: any) =>
      apiClient.put(API_ENDPOINTS.ORGANIZATIONS.UPDATE(id), data),
    
    delete: (id: string) =>
      apiClient.delete(API_ENDPOINTS.ORGANIZATIONS.DELETE(id)),
  },

  // Events
  events: {
    getPublic: () =>
      apiClient.get(API_ENDPOINTS.EVENTS.PUBLIC),
    
    getPublicById: (id: string) =>
      apiClient.get(API_ENDPOINTS.EVENTS.PUBLIC_BY_ID(id)),
    
    list: (params?: any) =>
      apiClient.get(API_ENDPOINTS.EVENTS.LIST, params),
    
    getById: (id: string) =>
      apiClient.get(API_ENDPOINTS.EVENTS.BY_ID(id)),
    
    create: (data: any, file?: File) =>
      file 
        ? apiClient.uploadFile(API_ENDPOINTS.EVENTS.CREATE, file, data)
        : apiClient.post(API_ENDPOINTS.EVENTS.CREATE, data),
    
    update: (id: string, data: any, file?: File) =>
      file
        ? apiClient.uploadFile(API_ENDPOINTS.EVENTS.UPDATE(id), file, data)
        : apiClient.put(API_ENDPOINTS.EVENTS.UPDATE(id), data),
    
    delete: (id: string) =>
      apiClient.delete(API_ENDPOINTS.EVENTS.DELETE(id)),
    
    getRegistrations: (id: string, params?: any) =>
      apiClient.get(API_ENDPOINTS.EVENTS.REGISTRATIONS(id), params),
    
    getStatistics: (id: string) =>
      apiClient.get(API_ENDPOINTS.EVENTS.STATISTICS(id)),
    
    checkEligibility: (id: string, data: any) =>
      apiClient.post(API_ENDPOINTS.EVENTS.CHECK_ELIGIBILITY(id), data),
  },

  // Registrations
  registrations: {
    create: (data: any) =>
      apiClient.post(API_ENDPOINTS.REGISTRATIONS.CREATE, data),
    
    getById: (id: string) =>
      apiClient.get(API_ENDPOINTS.REGISTRATIONS.BY_ID(id)),
    
    updateStatus: (id: string, status: string) =>
      apiClient.patch(API_ENDPOINTS.REGISTRATIONS.UPDATE_STATUS(id), { status }),
    
    validateQR: (qrCode: string) =>
      apiClient.post(API_ENDPOINTS.REGISTRATIONS.VALIDATE_QR, { qrCode }),
    
    validateManual: (uniqueId: string) =>
      apiClient.post(API_ENDPOINTS.REGISTRATIONS.VALIDATE_MANUAL, { uniqueId }),
    
    getCard: (id: string) =>
      apiClient.get(API_ENDPOINTS.REGISTRATIONS.CARD(id)),
    
    bulkUpdate: (registrationIds: string[], status: string) =>
      apiClient.patch(API_ENDPOINTS.REGISTRATIONS.BULK_UPDATE, { registrationIds, status }),
  },

  // Members
  members: {
    list: (params?: any) =>
      apiClient.get(API_ENDPOINTS.MEMBERS.LIST, params),
    
    getById: (id: string) =>
      apiClient.get(API_ENDPOINTS.MEMBERS.BY_ID(id)),
    
    create: (data: any) =>
      apiClient.post(API_ENDPOINTS.MEMBERS.CREATE, data),
    
    update: (id: string, data: any) =>
      apiClient.put(API_ENDPOINTS.MEMBERS.UPDATE(id), data),
    
    delete: (id: string) =>
      apiClient.delete(API_ENDPOINTS.MEMBERS.DELETE(id)),
    
    import: (file: File) =>
      apiClient.uploadFile(API_ENDPOINTS.MEMBERS.IMPORT, file),
  },

  // Payments
  payments: {
    initialize: (data: any) =>
      apiClient.post(API_ENDPOINTS.PAYMENTS.INITIALIZE, data),
    
    verify: (reference: string) =>
      apiClient.post(API_ENDPOINTS.PAYMENTS.VERIFY, { reference }),
  },

  // Tickets
  tickets: {
    buy: (data: any) =>
      apiClient.post(API_ENDPOINTS.TICKETS.BUY, data),
    
    getById: (id: string) =>
      apiClient.get(API_ENDPOINTS.TICKETS.BY_ID(id)),
    
    validate: (data: any) =>
      apiClient.post(API_ENDPOINTS.TICKETS.VALIDATE, data),
    
    transfer: (id: string, data: any) =>
      apiClient.post(API_ENDPOINTS.TICKETS.TRANSFER(id), data),
  },

  // Chat
  chat: {
    getSessions: () =>
      apiClient.get(API_ENDPOINTS.CHAT.SESSIONS),
    
    getMessages: (sessionId: string) =>
      apiClient.get(API_ENDPOINTS.CHAT.MESSAGES(sessionId)),
    
    getAdminStatus: () =>
      apiClient.get(API_ENDPOINTS.CHAT.ADMIN_STATUS),
  },

  // Notifications
  notifications: {
    list: (params?: any) =>
      apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, params),
    
    markRead: (id: string) =>
      apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
    
    markAllRead: () =>
      apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),
  },
};

export default apiClient;