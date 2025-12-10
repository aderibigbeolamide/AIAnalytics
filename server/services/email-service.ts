import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface EmailConfig {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface OrganizationApprovalEmailData {
  organizationName: string;
  contactPerson: string;
  status: 'approved' | 'rejected' | 'suspended';
  reason?: string;
  loginUrl?: string;
  adminEmail?: string;
}

export interface OrganizationRegistrationEmailData {
  organizationName: string;
  contactPerson: string;
  contactEmail: string;
  adminUsername: string;
}

export interface EventReminderEmailData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  participantName: string;
  eventUrl?: string;
  reminderType: 'day_before' | 'hour_before' | 'now';
}

export interface PaymentSuccessEmailData {
  participantName: string;
  eventName: string;
  amount: string;
  currency: string;
  transactionId: string;
  paymentDate: string;
  eventDate: string;
  eventLocation: string;
  ticketCount?: number;
  ticketNumbers?: string;
}

export interface RegistrationConfirmationEmailData {
  participantName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  registrationId: string;
  qrCode?: string;
  ticketPdf?: Buffer;
  eventUrl?: string;
}

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    try {
      const config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      };

      if (!config.host || !config.auth.user || !config.auth.pass) {
        console.warn('Email service not configured - missing environment variables');
        return;
      }

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email service configuration error:', error);
          this.isConfigured = false;
        } else {
          console.log('✅ Email service configured successfully');
        }
      });
    } catch (error) {
      console.error('Failed to setup email transporter:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(config: EmailConfig): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: `"Eventify AI" <${process.env.SMTP_USER}>`,
        to: Array.isArray(config.to) ? config.to.join(', ') : config.to,
        subject: config.subject,
        text: config.text,
        html: config.html,
        attachments: config.attachments || []
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // Organization approval/rejection email
  async sendOrganizationApprovalEmail(email: string, data: OrganizationApprovalEmailData): Promise<boolean> {
    const subject = data.status === 'approved' 
      ? `Welcome to Eventify AI - ${data.organizationName} Approved!`
      : data.status === 'suspended'
      ? `Account Suspended - ${data.organizationName}`
      : `Eventify AI Application Update - ${data.organizationName}`;

    const html = data.status === 'approved' ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Eventify AI!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${data.contactPerson}!</h2>
              <p>We're excited to inform you that <strong>${data.organizationName}</strong> has been approved for Eventify AI!</p>
              
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Access your organization dashboard</li>
                <li>Create your first event</li>
                <li>Invite your team members</li>
                <li>Start validating attendees with AI-powered tools</li>
              </ul>

              ${data.loginUrl ? `<a href="${data.loginUrl}" class="button">Access Your Dashboard</a>` : ''}
              
              <p><strong>Need help getting started?</strong></p>
              <p>Our team is here to help! Contact us at ${data.adminEmail || 'admin@eventifyai.com'} or check our documentation.</p>
              
              <p>Welcome to the future of event management!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>Transform your events with AI-powered validation</p>
            </div>
          </div>
        </body>
      </html>
    ` : data.status === 'suspended' ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Account Suspended</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.contactPerson},</h2>
              <p>We are writing to inform you that your organization, <strong>${data.organizationName}</strong>, has been suspended on Eventify AI.</p>
              
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              
              <p><strong>What this means:</strong></p>
              <ul>
                <li>All users associated with ${data.organizationName} will have their accounts suspended</li>
                <li>You will not be able to access your organization's dashboard</li>
                <li>Event creation and management services are temporarily restricted</li>
                <li>Existing events may be affected</li>
              </ul>
              
              <p><strong>To appeal this decision or understand the reason for suspension:</strong></p>
              <p>Please contact our support team at ${data.adminEmail || 'admin@eventifyai.com'} for assistance.</p>
              
              <p>We apologize for any inconvenience this may cause.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eventify AI Application Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.contactPerson},</h2>
              <p>Thank you for your interest in Eventify AI.</p>
              
              <p>After careful review, we're unable to approve <strong>${data.organizationName}</strong> at this time.</p>
              
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              
              <p>If you have questions or would like to reapply in the future, please contact us at ${data.adminEmail || 'admin@eventifyai.com'}.</p>
              
              <p>Thank you for considering Eventify AI.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Event reminder email
  async sendEventReminderEmail(email: string, data: EventReminderEmailData): Promise<boolean> {
    const reminderTitles = {
      day_before: '📅 Event Reminder: Tomorrow',
      hour_before: '⏰ Event Starting Soon: 1 Hour Left',
      now: '🚀 Event Starting Now'
    };

    const subject = `${reminderTitles[data.reminderType]} - ${data.eventName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .event-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${reminderTitles[data.reminderType]}</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.participantName}!</h2>
              
              ${data.reminderType === 'day_before' ? 
                '<p>This is a friendly reminder that you have an event coming up tomorrow.</p>' :
                data.reminderType === 'hour_before' ?
                '<p>Your event is starting in just 1 hour! Make sure you\'re ready to attend.</p>' :
                '<p>Your event is starting now! Don\'t miss it.</p>'
              }
              
              <div class="event-details">
                <h3>📋 Event Details</h3>
                <p><strong>Event:</strong> ${data.eventName}</p>
                <p><strong>Date:</strong> ${data.eventDate}</p>
                <p><strong>Time:</strong> ${data.eventTime}</p>
                <p><strong>Location:</strong> ${data.eventLocation}</p>
              </div>

              ${data.eventUrl ? `<a href="${data.eventUrl}" class="button">View Event Details</a>` : ''}
              
              <p><strong>Important reminders:</strong></p>
              <ul>
                <li>Bring your registration confirmation or QR code</li>
                <li>Arrive 15 minutes early for check-in</li>
                <li>Follow any event-specific guidelines</li>
              </ul>
              
              <p>We look forward to seeing you at the event!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>You're receiving this because you're registered for this event.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Payment success confirmation email
  async sendPaymentSuccessEmail(email: string, data: PaymentSuccessEmailData): Promise<boolean> {
    const subject = `💳 Payment Confirmed - ${data.eventName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .payment-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .event-details { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Successful!</h1>
            </div>
            <div class="content">
              <h2>Thank you ${data.participantName}!</h2>
              <p>Your payment has been successfully processed. You're all set for the event!</p>
              
              <div class="payment-details">
                <h3>💳 Payment Details</h3>
                <p><strong>Amount:</strong> ${data.currency} ${data.amount}</p>
                <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
                <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
                <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">Confirmed</span></p>
              </div>

              <div class="event-details">
                <h3>📅 Event Information</h3>
                <p><strong>Event:</strong> ${data.eventName}</p>
                <p><strong>Date:</strong> ${data.eventDate}</p>
                <p><strong>Location:</strong> ${data.eventLocation}</p>
              </div>
              
              <p><strong>What's next?</strong></p>
              <ul>
                <li>You'll receive your event ticket and QR code shortly</li>
                <li>Save this email as proof of payment</li>
                <li>We'll send event reminders as the date approaches</li>
              </ul>
              
              <p>If you have any questions about your payment or the event, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>Keep this email for your records</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Registration confirmation with ticket/PDF attachment
  async sendRegistrationConfirmationEmail(email: string, data: RegistrationConfirmationEmailData): Promise<boolean> {
    const subject = `🎫 Registration Confirmed - ${data.eventName}`;

    const attachments = [];
    
    // Add QR code as attachment if provided (with content ID for inline display)
    if (data.qrCode) {
      const qrBuffer = Buffer.from(data.qrCode.split(',')[1], 'base64');
      attachments.push({
        filename: `qr-code-${data.registrationId}.png`,
        content: qrBuffer,
        contentType: 'image/png',
        cid: `qr-code-${data.registrationId}.png` // Content ID for inline embedding
      });
    }

    // Add ticket PDF if provided
    if (data.ticketPdf) {
      attachments.push({
        filename: `ticket-${data.registrationId}.pdf`,
        content: data.ticketPdf,
        contentType: 'application/pdf'
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .ticket-info { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5; }
            .event-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .qr-code { text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Registration Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Great news ${data.participantName}!</h2>
              <p>You're successfully registered for <strong>${data.eventName}</strong>. We're excited to have you join us!</p>
              
              <div class="ticket-info">
                <h3>🎫 Your Ticket Information</h3>
                <p><strong>Registration ID:</strong> <code>${data.registrationId}</code></p>
                <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">Confirmed</span></p>
                ${data.qrCode ? '<p><strong>QR Code:</strong> Attached to this email</p>' : ''}
                ${data.ticketPdf ? '<p><strong>Ticket PDF:</strong> Attached to this email</p>' : ''}
              </div>

              <div class="event-details">
                <h3>📅 Event Details</h3>
                <p><strong>Event:</strong> ${data.eventName}</p>
                <p><strong>Date:</strong> ${data.eventDate}</p>
                <p><strong>Time:</strong> ${data.eventTime}</p>
                <p><strong>Location:</strong> ${data.eventLocation}</p>
              </div>

              ${data.qrCode ? `
                <div class="qr-code">
                  <h4>📱 Your QR Code</h4>
                  <img src="cid:qr-code-${data.registrationId}.png" alt="QR Code" style="max-width: 200px;" />
                  <p><em>Present this QR code at the event for quick check-in</em></p>
                </div>
              ` : ''}

              ${data.eventUrl ? `<a href="${data.eventUrl}" class="button">View Event Details</a>` : ''}
              
              <p><strong>Important Information:</strong></p>
              <ul>
                <li>Keep this email and attachments safe - you'll need them for event entry</li>
                <li>Arrive 15-20 minutes early for smooth check-in</li>
                <li>Bring a valid ID for verification if required</li>
                <li>You'll receive event reminders as the date approaches</li>
              </ul>
              
              <p>Questions? Contact the event organizers or reply to this email.</p>
              
              <p>Looking forward to seeing you at the event!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>You're receiving this confirmation for your event registration</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      attachments
    });
  }

  // Organization registration confirmation email
  async sendOrganizationRegistrationEmail(email: string, data: OrganizationRegistrationEmailData): Promise<boolean> {
    const subject = `Registration Received - ${data.organizationName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .status-box { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Registration Received</h1>
            </div>
            <div class="content">
              <h2>Thank you ${data.contactPerson}!</h2>
              <p>We have received your organization registration request for <strong>${data.organizationName}</strong>.</p>
              
              <div class="status-box">
                <h3>⏳ What happens next?</h3>
                <ul>
                  <li>Your application is currently being reviewed by our team</li>
                  <li>We'll notify you via email once the review is complete</li>
                  <li>This process typically takes 1-2 business days</li>
                  <li>Once approved, you'll receive login credentials and access to your dashboard</li>
                </ul>
              </div>
              
              <p><strong>Registration Details:</strong></p>
              <ul>
                <li><strong>Organization:</strong> ${data.organizationName}</li>
                <li><strong>Admin Username:</strong> ${data.adminUsername}</li>
                <li><strong>Contact Email:</strong> ${data.contactEmail}</li>
              </ul>
              
              <p><strong>Questions?</strong> Our support team is here to help! Contact us at admin@eventifyai.com</p>
              
              <p>Thank you for choosing Eventify AI!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>Transform your events with AI-powered validation</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // OTP verification email
  async sendOTPVerificationEmail(email: string, otp: string, organizationName?: string): Promise<boolean> {
    const subject = `Verify Your Email - OTP Code`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .otp-box { background: #f0f9ff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .otp-code { font-size: 36px; font-weight: bold; color: #4F46E5; letter-spacing: 8px; margin: 10px 0; font-family: monospace; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for starting your organization registration${organizationName ? ` for <strong>${organizationName}</strong>` : ''}. Please use the verification code below to confirm your email address.</p>
              
              <div class="otp-box">
                <h3>Your Verification Code</h3>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0; color: #666; font-size: 14px;">This code will expire in 10 minutes</p>
              </div>
              
              <p><strong>Security Notice:</strong></p>
              <ul>
                <li>This code is valid for 10 minutes only</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this verification, please ignore this email</li>
              </ul>
              
              <p>Need help? Contact our support team at admin@eventifyai.com</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>Secure email verification for organization registration</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // General notification email
  async sendNotificationEmail(email: string, subject: string, message: string, isHtml = false): Promise<boolean> {
    const emailContent = isHtml ? message : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eventify AI Notification</h1>
            </div>
            <div class="content">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html: emailContent
    });
  }

  // Payment success email with PDF attachments for multiple tickets
  async sendPaymentSuccessEmailWithAttachments(email: string, data: PaymentSuccessEmailData, attachments: Array<{filename: string, content: Buffer, contentType: string}>): Promise<boolean> {
    const subject = `Payment Confirmed - ${data.eventName} ${data.ticketCount ? `(${data.ticketCount} Tickets)` : 'Ticket'}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
            .success-badge { background: #10B981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
            .ticket-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .highlight { color: #4F46E5; font-weight: bold; }
            .attachment-note { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payment Successful!</h1>
            </div>
            <div class="content">
              <div class="success-badge">✅ Payment Confirmed</div>
              
              <h2>Hi ${data.participantName}!</h2>
              <p>Great news! Your payment has been successfully processed and your ${data.ticketCount ? `${data.ticketCount} tickets have` : 'ticket has'} been confirmed.</p>
              
              <div class="ticket-info">
                <h3>🎫 ${data.ticketCount ? 'Tickets' : 'Ticket'} Details</h3>
                <p><strong>Event:</strong> ${data.eventName}</p>
                <p><strong>Date:</strong> ${data.eventDate}</p>
                <p><strong>Location:</strong> ${data.eventLocation}</p>
                ${data.ticketCount ? `<p><strong>Number of Tickets:</strong> ${data.ticketCount}</p>` : ''}
                ${data.ticketNumbers ? `<p><strong>Ticket Numbers:</strong> ${data.ticketNumbers}</p>` : ''}
                <p><strong>Amount Paid:</strong> <span class="highlight">${data.currency} ${data.amount}</span></p>
                <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
                <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
              </div>
              
              <div class="attachment-note">
                <h4>📎 Your Ticket${data.ticketCount && data.ticketCount > 1 ? 's' : ''} ${data.ticketCount && data.ticketCount > 1 ? 'are' : 'is'} Attached!</h4>
                <p>We've attached ${data.ticketCount ? `all ${data.ticketCount} of your tickets` : 'your ticket'} as PDF files to this email. Each ticket includes:</p>
                <ul>
                  <li>✅ Your unique QR code for entry</li>
                  <li>📅 Complete event details</li>
                  <li>🎫 Individual ticket numbers</li>
                  <li>🔒 Security features for validation</li>
                </ul>
                <p><strong>Please save these tickets and bring them (digital or printed) to the event!</strong></p>
              </div>

              <h3>🎯 What's Next?</h3>
              <ul>
                <li>📱 Save your ticket PDFs to your phone or print them</li>
                <li>🆔 Bring a valid ID that matches your ticket details</li>
                <li>⏰ Arrive 15-20 minutes early for smooth check-in</li>
                <li>📱 Present your QR code for quick entry</li>
              </ul>

              <p><strong>Important:</strong> Each ticket has a unique QR code. Make sure to bring ${data.ticketCount && data.ticketCount > 1 ? 'all tickets' : 'your ticket'} for entry validation.</p>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
              
              <p>Thank you for choosing Eventify AI!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Eventify AI. All rights reserved.</p>
              <p>For support: admin@eventifyai.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      attachments
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();