import { Notification, User, Event, EventRegistration, Organization } from '../shared/mongoose-schema.js';
import mongoose from 'mongoose';

export interface CreateNotificationData {
  organizationId: string;
  recipientId: string;
  senderId?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  category: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const notification = new Notification({
        organizationId: new mongoose.Types.ObjectId(data.organizationId),
        recipientId: new mongoose.Types.ObjectId(data.recipientId),
        senderId: data.senderId ? new mongoose.Types.ObjectId(data.senderId) : undefined,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        priority: data.priority || 'medium',
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        expiresAt: data.expiresAt,
        category: data.category,
        isRead: false
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create payment received notification for organization admin
   */
  static async createPaymentNotification(
    organizationId: string,
    eventId: string,
    paymentAmount: number,
    currency: string,
    payerName: string,
    paymentType: 'event_registration' | 'ticket_purchase'
  ) {
    try {
      // Get organization and event details
      const [organization, event] = await Promise.all([
        Organization.findById(organizationId),
        Event.findById(eventId)
      ]);

      if (!organization || !event) {
        throw new Error('Organization or event not found');
      }

      // Get organization admin/creator
      const admin = await User.findOne({ 
        organizationId: new mongoose.Types.ObjectId(organizationId),
        role: 'admin'
      });

      if (!admin) {
        console.warn('No admin found for organization:', organizationId);
        return;
      }

      const title = `Payment Received - ${currency}${paymentAmount.toLocaleString()}`;
      const message = `${payerName} has made a payment of ${currency}${paymentAmount.toLocaleString()} for ${event.name}`;

      await this.createNotification({
        organizationId,
        recipientId: (admin._id as mongoose.Types.ObjectId).toString(),
        type: 'payment_received',
        title,
        message,
        data: {
          eventId,
          eventName: event.name,
          paymentAmount,
          currency,
          payerName,
          paymentType
        },
        priority: 'high',
        category: 'payments',
        actionUrl: `/events/${eventId}`,
        actionLabel: 'View Event'
      });

      console.log(`Payment notification created for organization ${organizationId}`);
    } catch (error) {
      console.error('Error creating payment notification:', error);
    }
  }

  /**
   * Create event registration notification
   */
  static async createRegistrationNotification(
    organizationId: string,
    eventId: string,
    registrationId: string,
    registrantName: string,
    registrationType: string
  ) {
    try {
      const [organization, event, admin] = await Promise.all([
        Organization.findById(organizationId),
        Event.findById(eventId),
        User.findOne({ 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          role: 'admin'
        })
      ]);

      if (!organization || !event || !admin) {
        console.warn('Missing data for registration notification');
        return;
      }

      const title = `New Registration: ${event.name}`;
      const message = `${registrantName} has registered for ${event.name} as a ${registrationType}`;

      await this.createNotification({
        organizationId,
        recipientId: (admin._id as mongoose.Types.ObjectId).toString(),
        type: 'event_registration',
        title,
        message,
        data: {
          eventId,
          eventName: event.name,
          registrationId,
          registrantName,
          registrationType
        },
        priority: 'medium',
        category: 'events',
        actionUrl: `/events/${eventId}`,
        actionLabel: 'View Registrations'
      });

    } catch (error) {
      console.error('Error creating registration notification:', error);
    }
  }

  /**
   * Create super admin message notification
   */
  static async createSuperAdminMessage(
    organizationId: string,
    senderId: string,
    title: string,
    message: string,
    priority: string = 'medium'
  ) {
    try {
      // Get all admin users in the organization
      const admins = await User.find({ 
        organizationId: new mongoose.Types.ObjectId(organizationId),
        role: 'admin',
        status: 'active'
      });

      if (admins.length === 0) {
        console.warn('No active admins found for organization:', organizationId);
        return;
      }

      // Create notification for each admin
      const notifications = admins.map(admin => 
        this.createNotification({
          organizationId,
          recipientId: (admin._id as mongoose.Types.ObjectId).toString(),
          senderId,
          type: 'super_admin_message',
          title: `Super Admin: ${title}`,
          message,
          priority,
          category: 'messages',
          actionUrl: '/messages',
          actionLabel: 'View Messages'
        })
      );

      await Promise.all(notifications);
      console.log(`Super admin message sent to ${admins.length} admins in organization ${organizationId}`);

    } catch (error) {
      console.error('Error creating super admin message:', error);
    }
  }

  /**
   * Create system alert notification
   */
  static async createSystemAlert(
    organizationId: string,
    title: string,
    message: string,
    priority: string = 'medium',
    expirationDays: number = 30
  ) {
    try {
      const admins = await User.find({ 
        organizationId: new mongoose.Types.ObjectId(organizationId),
        role: 'admin',
        status: 'active'
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const notifications = admins.map(admin => 
        this.createNotification({
          organizationId,
          recipientId: (admin._id as mongoose.Types.ObjectId).toString(),
          type: 'system_alert',
          title: `System Alert: ${title}`,
          message,
          priority,
          category: 'system',
          expiresAt
        })
      );

      await Promise.all(notifications);

    } catch (error) {
      console.error('Error creating system alert:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false) {
    try {
      const query: any = { recipientId: new mongoose.Types.ObjectId(userId) };
      
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .populate('senderId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .limit(limit);

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { 
          _id: new mongoose.Types.ObjectId(notificationId),
          recipientId: new mongoose.Types.ObjectId(userId)
        },
        { 
          isRead: true,
          readAt: new Date()
        },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      await Notification.updateMany(
        { 
          recipientId: new mongoose.Types.ObjectId(userId),
          isRead: false
        },
        { 
          isRead: true,
          readAt: new Date()
        }
      );

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      await Notification.findOneAndDelete({ 
        _id: new mongoose.Types.ObjectId(notificationId),
        recipientId: new mongoose.Types.ObjectId(userId)
      });

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string) {
    try {
      const count = await Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(userId),
        isRead: false
      });

      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }
}