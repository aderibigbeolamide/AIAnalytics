import mongoose from 'mongoose';
import { Event, EventRegistration, Ticket, User, Organization } from '../shared/mongoose-schema.js';
import { NotificationService } from './notification-service.js';
import { sendEmail } from './email.js';

export interface ReminderSettings {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  beforeEventDays: number[]; // Days before event to send reminders (e.g., [7, 3, 1])
  beforeEventHours: number[]; // Hours before event to send reminders (e.g., [24, 2])
}

export class EventReminderService {
  
  /**
   * Process all pending reminders for upcoming events
   */
  static async processEventReminders() {
    try {
      console.log('Processing event reminders...');
      const now = new Date();
      
      // Get events that are upcoming (not started yet)
      const upcomingEvents = await Event.find({
        startDate: { $gt: now },
        status: { $in: ['upcoming', 'active'] },
        deletedAt: { $exists: false }
      }).populate('organizationId');

      console.log(`Found ${upcomingEvents.length} upcoming events`);

      for (const event of upcomingEvents) {
        await this.processEventReminder(event);
      }

      console.log('Completed processing event reminders');
    } catch (error) {
      console.error('Error processing event reminders:', error);
    }
  }

  /**
   * Process reminders for a specific event
   */
  static async processEventReminder(event: any) {
    try {
      const now = new Date();
      const eventStart = new Date(event.startDate);
      const timeDiff = eventStart.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));

      console.log(`Processing reminders for event: ${event.name}, Days until event: ${daysDiff}, Hours until event: ${hoursDiff}`);

      // Default reminder settings (can be customized per organization in the future)
      const reminderSettings: ReminderSettings = {
        emailEnabled: true,
        inAppEnabled: true,
        beforeEventDays: [7, 3, 1], // 7 days, 3 days, 1 day before
        beforeEventHours: [24, 2] // 24 hours, 2 hours before
      };

      // Check if we should send day-based reminders
      if (reminderSettings.beforeEventDays.includes(daysDiff) && hoursDiff > 24) {
        await this.sendEventReminders(event, `${daysDiff} day${daysDiff > 1 ? 's' : ''}`, reminderSettings);
      }
      
      // Check if we should send hour-based reminders
      if (reminderSettings.beforeEventHours.includes(hoursDiff) && hoursDiff <= 24) {
        await this.sendEventReminders(event, `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''}`, reminderSettings);
      }

    } catch (error) {
      console.error(`Error processing reminder for event ${event.name}:`, error);
    }
  }

  /**
   * Send reminders to all registered participants
   */
  static async sendEventReminders(event: any, timeRemaining: string, settings: ReminderSettings) {
    try {
      console.log(`Sending ${timeRemaining} reminders for event: ${event.name}`);

      // Get all participants based on event type
      let participants: any[] = [];

      if (event.eventType === 'registration') {
        // For registration-based events, get event registrations
        const registrations = await EventRegistration.find({
          eventId: event._id,
          status: { $in: ['confirmed', 'pending'] }
        });
        
        participants = registrations.map(reg => ({
          email: reg.email,
          name: `${reg.firstName} ${reg.lastName}`,
          type: 'registration',
          id: reg._id
        }));
      } else if (event.eventType === 'ticket') {
        // For ticket-based events, get tickets
        const tickets = await Ticket.find({
          eventId: event._id,
          paymentStatus: 'paid',
          status: { $in: ['paid', 'pending'] }
        });
        
        participants = tickets.map(ticket => ({
          email: ticket.ownerEmail,
          name: ticket.ownerName,
          type: 'ticket',
          id: ticket._id
        }));
      }

      console.log(`Found ${participants.length} participants for event ${event.name}`);

      // Get organization admin for in-app notifications
      const orgAdmin = await User.findOne({
        organizationId: event.organizationId._id,
        role: 'admin'
      });

      // Send reminders to each participant
      for (const participant of participants) {
        // Create unique reminder identifier to prevent duplicate reminders
        const reminderKey = `${event._id}_${participant.id}_${timeRemaining}`;
        
        // Check if reminder was already sent (using a simple time-based check)
        const recentReminder = await this.checkRecentReminder(event._id, participant.email, timeRemaining);
        if (recentReminder) {
          console.log(`Reminder already sent to ${participant.email} for ${timeRemaining} before ${event.name}`);
          continue;
        }

        // Send in-app notification
        if (settings.inAppEnabled && orgAdmin) {
          await this.createReminderNotification(event, participant, timeRemaining, orgAdmin._id.toString());
        }

        // Send email reminder
        if (settings.emailEnabled) {
          await this.sendReminderEmail(event, participant, timeRemaining);
        }
      }

      console.log(`Completed sending ${timeRemaining} reminders for event: ${event.name}`);
    } catch (error) {
      console.error(`Error sending reminders for event ${event.name}:`, error);
    }
  }

  /**
   * Check if a reminder was recently sent to avoid duplicates
   */
  static async checkRecentReminder(eventId: string, participantEmail: string, timeRemaining: string): Promise<boolean> {
    try {
      // Look for notifications created in the last 2 hours with same event and time remaining
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      // For now, we'll use a simple approach - in production, you might want to store reminder history
      // This prevents sending the same reminder multiple times within 2 hours
      const db = mongoose.connection.db;
      if (!db) return false;
      
      const recentNotifications = await db.collection('notifications').findOne({
        'data.eventId': eventId,
        'data.timeRemaining': timeRemaining,
        'data.participantEmail': participantEmail,
        createdAt: { $gte: twoHoursAgo },
        type: 'event_reminder'
      });

      return !!recentNotifications;
    } catch (error) {
      console.error('Error checking recent reminders:', error);
      return false;
    }
  }

  /**
   * Create in-app notification for event reminder
   */
  static async createReminderNotification(event: any, participant: any, timeRemaining: string, adminId: string) {
    try {
      const title = `Event Reminder: ${event.name}`;
      const message = `Reminder: ${event.name} starts in ${timeRemaining}. Location: ${event.location}`;

      await NotificationService.createNotification({
        organizationId: event.organizationId._id.toString(),
        recipientId: adminId.toString(),
        type: 'event_reminder',
        title,
        message,
        data: {
          eventId: event._id.toString(),
          eventName: event.name,
          participantEmail: participant.email,
          participantName: participant.name,
          timeRemaining,
          eventLocation: event.location,
          eventStartDate: event.startDate
        },
        priority: timeRemaining.includes('hour') ? 'high' : 'medium',
        category: 'events',
        actionUrl: `/events/${event._id}`,
        actionLabel: 'View Event',
        expiresAt: new Date(event.startDate.getTime() + 24 * 60 * 60 * 1000) // Expire 24 hours after event
      });

      console.log(`Created reminder notification for ${participant.name} - ${event.name} (${timeRemaining})`);
    } catch (error) {
      console.error('Error creating reminder notification:', error);
    }
  }

  /**
   * Send email reminder to participant
   */
  static async sendReminderEmail(event: any, participant: any, timeRemaining: string) {
    try {
      const subject = `Reminder: ${event.name} starts in ${timeRemaining}`;
      const eventDate = new Date(event.startDate).toLocaleDateString();
      const eventTime = new Date(event.startDate).toLocaleTimeString();
      
      const htmlContent = this.generateReminderEmailHTML(event, participant, timeRemaining, eventDate, eventTime);
      
      const textContent = `
Hi ${participant.name},

This is a friendly reminder that ${event.name} is starting in ${timeRemaining}.

Event Details:
- Event: ${event.name}
- Date: ${eventDate}
- Time: ${eventTime}
- Location: ${event.location}

${event.description ? `Description: ${event.description}` : ''}

We look forward to seeing you there!

Best regards,
EventValidate Team
      `.trim();

      const emailResult = await sendEmail({
        to: participant.email,
        from: process.env.EMAIL_FROM || 'noreply@eventvalidate.com',
        subject,
        text: textContent,
        html: htmlContent
      });

      if (emailResult) {
        console.log(`Reminder email sent to ${participant.email} for ${event.name} (${timeRemaining})`);
      } else {
        console.error(`Failed to send reminder email to ${participant.email} for ${event.name}`);
      }
    } catch (error) {
      console.error(`Error sending reminder email to ${participant.email}:`, error);
    }
  }

  /**
   * Generate HTML content for reminder email
   */
  static generateReminderEmailHTML(event: any, participant: any, timeRemaining: string, eventDate: string, eventTime: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Event Reminder</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header {
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .event-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .event-details {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #555;
        }
        .value {
            color: #333;
        }
        .cta-button {
            background: #007bff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .reminder-badge {
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-weight: bold;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔔 Event Reminder</h1>
        <div class="reminder-badge">Starting in ${timeRemaining}</div>
    </div>
    
    <p>Hi ${participant.name},</p>
    
    <p>This is a friendly reminder that <strong>${event.name}</strong> is starting soon!</p>
    
    <div class="event-card">
        <h2 style="margin-top: 0; color: #2c3e50;">${event.name}</h2>
        
        <div class="event-details">
            <div class="detail-row">
                <span class="label">📅 Date:</span>
                <span class="value">${eventDate}</span>
            </div>
            <div class="detail-row">
                <span class="label">🕐 Time:</span>
                <span class="value">${eventTime}</span>
            </div>
            <div class="detail-row">
                <span class="label">📍 Location:</span>
                <span class="value">${event.location}</span>
            </div>
            <div class="detail-row">
                <span class="label">⏰ Starts in:</span>
                <span class="value" style="color: #e74c3c; font-weight: bold;">${timeRemaining}</span>
            </div>
        </div>
        
        ${event.description ? `
        <div style="margin-top: 20px;">
            <h3 style="color: #2c3e50;">Event Description:</h3>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
                ${event.description}
            </p>
        </div>
        ` : ''}
    </div>
    
    <div style="text-align: center;">
        <a href="${process.env.APP_DOMAIN || 'http://localhost:5000'}/event-view/${event._id}" class="cta-button">
            View Event Details
        </a>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>💡 Important Reminders:</strong>
        <ul style="margin: 10px 0;">
            <li>Please arrive 15 minutes early for check-in</li>
            <li>Bring a valid ID for verification</li>
            ${participant.type === 'ticket' ? '<li>Have your ticket QR code ready for scanning</li>' : ''}
            ${participant.type === 'registration' ? '<li>Your registration will be verified at the entrance</li>' : ''}
        </ul>
    </div>
    
    <div class="footer">
        <p>We look forward to seeing you at the event!</p>
        <p style="font-size: 12px; color: #999;">
            This is an automated reminder from EventValidate.<br>
            If you have any questions, please contact the event organizer.
        </p>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Manually trigger reminders for a specific event
   */
  static async triggerEventReminder(eventId: string, timeRemaining: string) {
    try {
      const event = await Event.findById(eventId).populate('organizationId');
      if (!event) {
        throw new Error('Event not found');
      }

      const reminderSettings: ReminderSettings = {
        emailEnabled: true,
        inAppEnabled: true,
        beforeEventDays: [7, 3, 1],
        beforeEventHours: [24, 2]
      };

      await this.sendEventReminders(event, timeRemaining, reminderSettings);
      return { success: true, message: `Reminders sent for ${event.name}` };
    } catch (error) {
      console.error('Error triggering manual reminder:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events that need reminders
   */
  static async getUpcomingEventsForReminders() {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const events = await Event.find({
        startDate: { 
          $gte: now,
          $lte: oneWeekFromNow
        },
        status: { $in: ['upcoming', 'active'] },
        deletedAt: { $exists: false }
      }).populate('organizationId');

      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }
}