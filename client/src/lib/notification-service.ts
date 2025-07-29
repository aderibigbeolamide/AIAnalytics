import { apiRequest } from './queryClient';

export interface Notification {
  _id: string;
  organizationId: string;
  recipientId: string;
  senderId?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority: string;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationService {
  /**
   * Get user notifications
   */
  static async getNotifications(limit: number = 20, unreadOnly: boolean = false): Promise<Notification[]> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (unreadOnly) {
      params.set('unreadOnly', 'true');
    }

    const response = await apiRequest(`/api/notifications?${params.toString()}`);
    return response;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    const response = await apiRequest('/api/notifications/unread-count');
    return response.count;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    return response;
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<void> {
    await apiRequest('/api/notifications/read-all', {
      method: 'PATCH'
    });
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await apiRequest(`/api/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Super admin: Send message to organization
   */
  static async sendSuperAdminMessage(
    organizationId: string,
    title: string,
    message: string,
    priority: string = 'medium'
  ): Promise<void> {
    await apiRequest('/api/super-admin/send-message', {
      method: 'POST',
      body: JSON.stringify({
        organizationId,
        title,
        message,
        priority
      })
    });
  }

  /**
   * Super admin: Send system alert
   */
  static async sendSystemAlert(
    organizationId: string,
    title: string,
    message: string,
    priority: string = 'medium',
    expirationDays: number = 30
  ): Promise<void> {
    await apiRequest('/api/super-admin/send-alert', {
      method: 'POST',
      body: JSON.stringify({
        organizationId,
        title,
        message,
        priority,
        expirationDays
      })
    });
  }

  /**
   * Super admin: Broadcast message to all organizations
   */
  static async broadcastMessage(
    title: string,
    message: string,
    priority: string = 'medium',
    expirationDays: number = 30
  ): Promise<void> {
    await apiRequest('/api/super-admin/broadcast-message', {
      method: 'POST',
      body: JSON.stringify({
        title,
        message,
        priority,
        expirationDays
      })
    });
  }

  /**
   * Get notification statistics (super admin only)
   */
  static async getNotificationStats(): Promise<any> {
    const response = await apiRequest('/api/super-admin/notification-stats');
    return response;
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpired(): Promise<void> {
    await apiRequest('/api/notifications/cleanup', {
      method: 'POST'
    });
  }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'payment_received':
      return '💰'; // Money bag
    case 'ticket_purchased':
      return '🎫'; // Ticket
    case 'event_registration':
      return '📝'; // Memo
    case 'super_admin_message':
      return '👔'; // Business suit
    case 'system_alert':
      return '⚠️'; // Warning
    default:
      return '🔔'; // Bell
  }
}

/**
 * Get notification color based on priority
 */
export function getNotificationColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
}

/**
 * Format notification time
 */
export function formatNotificationTime(date: Date | string): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return notificationDate.toLocaleDateString();
  }
}