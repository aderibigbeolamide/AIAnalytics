import { emailService } from './email-service';
import { pdfService } from './pdf-service';
import { mongoStorage } from '../mongodb-storage';

export interface NotificationData {
  type: 'organization_approval' | 'event_reminder' | 'payment_success' | 'registration_confirmation' | 'general';
  recipient: {
    email: string;
    name?: string;
    id?: string;
  };
  data: any;
  priority?: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
}

class NotificationService {
  private notificationQueue: NotificationData[] = [];
  private isProcessing = false;

  constructor() {
    // Process queue every 30 seconds
    setInterval(() => this.processQueue(), 30000);
    console.log('📬 Notification service initialized');
  }

  /**
   * Add notification to queue
   */
  async queueNotification(notification: NotificationData): Promise<void> {
    // Add timestamp and ID
    const enrichedNotification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      scheduledFor: notification.scheduledFor || new Date()
    };

    this.notificationQueue.push(enrichedNotification);
    console.log(`📥 Queued ${notification.type} notification for ${notification.recipient.email}`);

    // Process immediately if high priority
    if (notification.priority === 'high') {
      this.processQueue();
    }
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const now = new Date();
    
    // Get notifications ready to be sent
    const readyNotifications = this.notificationQueue.filter(
      notification => notification.scheduledFor <= now
    );

    if (readyNotifications.length === 0) {
      this.isProcessing = false;
      return;
    }

    console.log(`📤 Processing ${readyNotifications.length} notifications`);

    for (const notification of readyNotifications) {
      try {
        await this.sendNotification(notification);
        
        // Remove from queue after successful send
        this.notificationQueue = this.notificationQueue.filter(
          n => n.id !== notification.id
        );
        
        console.log(`✅ Sent ${notification.type} notification to ${notification.recipient.email}`);
      } catch (error) {
        console.error(`❌ Failed to send ${notification.type} notification:`, error);
        
        // Retry logic - move to end of queue with delay
        notification.scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
      }
    }

    this.isProcessing = false;
  }

  /**
   * Send individual notification
   */
  private async sendNotification(notification: NotificationData): Promise<boolean> {
    switch (notification.type) {
      case 'organization_approval':
        return this.sendOrganizationApprovalNotification(notification);
      
      case 'event_reminder':
        return this.sendEventReminderNotification(notification);
      
      case 'payment_success':
        return this.sendPaymentSuccessNotification(notification);
      
      case 'registration_confirmation':
        return this.sendRegistrationConfirmationNotification(notification);
      
      case 'general':
        return this.sendGeneralNotification(notification);
      
      default:
        console.error(`Unknown notification type: ${notification.type}`);
        return false;
    }
  }

  private async sendOrganizationApprovalNotification(notification: NotificationData): Promise<boolean> {
    return emailService.sendOrganizationApprovalEmail(
      notification.recipient.email,
      notification.data
    );
  }

  private async sendEventReminderNotification(notification: NotificationData): Promise<boolean> {
    return emailService.sendEventReminderEmail(
      notification.recipient.email,
      notification.data
    );
  }

  private async sendPaymentSuccessNotification(notification: NotificationData): Promise<boolean> {
    return emailService.sendPaymentSuccessEmail(
      notification.recipient.email,
      notification.data
    );
  }

  private async sendRegistrationConfirmationNotification(notification: NotificationData): Promise<boolean> {
    return emailService.sendRegistrationConfirmationEmail(
      notification.recipient.email,
      notification.data
    );
  }

  private async sendGeneralNotification(notification: NotificationData): Promise<boolean> {
    return emailService.sendNotificationEmail(
      notification.recipient.email,
      notification.data.subject,
      notification.data.message,
      notification.data.isHtml || false
    );
  }

  /**
   * Schedule event reminders
   */
  async scheduleEventReminders(eventId: string): Promise<void> {
    try {
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const registrations = await mongoStorage.getEventRegistrations(eventId);
      const eventDate = new Date(event.startDate);
      const now = new Date();

      for (const registration of registrations) {
        if (registration.status !== 'registered' && registration.status !== 'attended') {
          continue;
        }

        // Get participant email and name
        let email: string;
        let name: string;

        if (registration.registrationType === 'member' && registration.memberId) {
          const member = await mongoStorage.getMember(registration.memberId.toString());
          if (!member) continue;
          email = member.email;
          name = member.fullName;
        } else {
          email = registration.guestEmail || '';
          name = registration.guestName || 'Participant';
        }

        if (!email) continue;

        const reminderData = {
          eventName: event.name,
          eventDate: eventDate.toLocaleDateString(),
          eventTime: eventDate.toLocaleTimeString(),
          eventLocation: event.location,
          participantName: name,
          eventUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/events/${eventId}/public`
        };

        // Schedule 1 day before reminder
        const dayBeforeDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
        if (dayBeforeDate > now) {
          await this.queueNotification({
            type: 'event_reminder',
            recipient: { email, name },
            data: { ...reminderData, reminderType: 'day_before' },
            priority: 'medium',
            scheduledFor: dayBeforeDate
          });
        }

        // Schedule 1 hour before reminder
        const hourBeforeDate = new Date(eventDate.getTime() - 60 * 60 * 1000);
        if (hourBeforeDate > now) {
          await this.queueNotification({
            type: 'event_reminder',
            recipient: { email, name },
            data: { ...reminderData, reminderType: 'hour_before' },
            priority: 'high',
            scheduledFor: hourBeforeDate
          });
        }
      }

      console.log(`📅 Scheduled reminders for event: ${event.name}`);
    } catch (error) {
      console.error('Failed to schedule event reminders:', error);
      throw error;
    }
  }

  /**
   * Send immediate payment success notification
   */
  async notifyPaymentSuccess(paymentData: any): Promise<void> {
    const { registration, event, payment } = paymentData;

    // Get participant details
    let email: string;
    let name: string;

    if (registration.registrationType === 'member' && registration.memberId) {
      const member = await mongoStorage.getMember(registration.memberId.toString());
      if (!member) return;
      email = member.email;
      name = member.fullName;
    } else {
      email = registration.guestEmail || '';
      name = registration.guestName || 'Participant';
    }

    if (!email) return;

    await this.queueNotification({
      type: 'payment_success',
      recipient: { email, name },
      data: {
        participantName: name,
        eventName: event.name,
        amount: payment.amount,
        currency: payment.currency,
        transactionId: payment.reference,
        paymentDate: new Date().toLocaleDateString(),
        eventDate: new Date(event.startDate).toLocaleDateString(),
        eventLocation: event.location
      },
      priority: 'high'
    });
  }

  /**
   * Send registration confirmation with ticket
   */
  async notifyRegistrationSuccess(registrationData: any): Promise<void> {
    const { registration, event, qrCode } = registrationData;

    // Get participant details
    let email: string;
    let name: string;

    if (registration.registrationType === 'member' && registration.memberId) {
      const member = await mongoStorage.getMember(registration.memberId.toString());
      if (!member) return;
      email = member.email;
      name = member.fullName;
    } else {
      email = registration.guestEmail || '';
      name = registration.guestName || 'Participant';
    }

    if (!email) return;

    // Generate ticket PDF
    let ticketPdf: Buffer | undefined;
    try {
      ticketPdf = await pdfService.generateEventTicket({
        eventName: event.name || 'Event',
        eventDate: event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Date TBD',
        eventTime: event.startDate ? new Date(event.startDate).toLocaleTimeString() : 'Time TBD',
        eventLocation: event.location || 'Location TBD',
        participantName: name || 'Participant',
        registrationId: registration.uniqueId || registration._id?.toString() || 'N/A',
        qrCodeData: registration.qrCode || qrCode || '{}',
        organizationName: event.organizationName || 'EventValidate',
        ticketType: registration.registrationType || 'Standard'
      });
    } catch (error) {
      console.error('Failed to generate ticket PDF:', error);
      // Continue without PDF if generation fails
    }

    await this.queueNotification({
      type: 'registration_confirmation',
      recipient: { email, name },
      data: {
        participantName: name,
        eventName: event.name,
        eventDate: new Date(event.startDate).toLocaleDateString(),
        eventTime: new Date(event.startDate).toLocaleTimeString(),
        eventLocation: event.location,
        registrationId: registration.uniqueId || registration._id?.toString(),
        qrCode,
        ticketPdf,
        eventUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/events/${event._id?.toString()}/public`
      },
      priority: 'high'
    });

    // Also schedule event reminders for this registration
    await this.scheduleEventReminders(event._id?.toString());
  }

  /**
   * Send organization approval notification
   */
  async notifyOrganizationApproval(organizationData: any): Promise<void> {
    const { organization, status, reason, adminUser } = organizationData;

    await this.queueNotification({
      type: 'organization_approval',
      recipient: { 
        email: organization.email, 
        name: organization.contactPerson 
      },
      data: {
        organizationName: organization.name,
        contactPerson: organization.contactPerson,
        status,
        reason,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/login`,
        adminEmail: process.env.MAILER_USER
      },
      priority: 'high'
    });
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.notificationQueue.length,
      processing: this.isProcessing
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();