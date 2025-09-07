# EventValidate Email System Guide

## Overview
The EventValidate platform includes a comprehensive email service that automatically sends professional emails for all major workflows including organization approvals, event reminders, payment confirmations, and registration confirmations with PDF tickets.

## Email Service Configuration

### Environment Variables
Add these to your `.env` file (see `.env.example` for template):

```bash
# Email Service Configuration (Zoho SMTP)
MAILER_SERVICE="smtp.zoho.eu"
MAILER_HOST="smtp.zoho.eu"
MAILER_PORT=587
MAILER_USER="admin@eventifyai.com"
MAILER_PASS="JCrSaUVGCnyD"
```

**Security Note**: Never commit actual credentials to version control. Add them locally and in production environment.

## Email Types and Triggers

### 1. Organization Approval/Rejection
**Trigger**: When super admin approves or rejects an organization
**Recipients**: Organization contact person
**Content**: Welcome message with login details or rejection notice
**API Endpoint**: `PATCH /api/organizations/:id/approval`

### 2. Event Reminders
**Trigger**: Automatically scheduled for registered participants
**Recipients**: All event participants
**Schedule**: 
- 1 day before event
- 1 hour before event
**Content**: Event details with location and timing
**API Endpoint**: `POST /api/email/event-reminders/:eventId`

### 3. Payment Success Confirmation
**Trigger**: When payment is verified via Paystack webhook
**Recipients**: Payment maker
**Content**: Payment receipt with transaction details
**API Endpoint**: `POST /api/payment/verify`

### 4. Registration Confirmation with Ticket
**Trigger**: When event registration is created
**Recipients**: Registrant
**Content**: Registration confirmation with QR code and PDF ticket attached
**Attachments**: 
- QR code image (PNG)
- Event ticket (PDF)
**API Endpoint**: `POST /api/registrations`

### 5. Bulk Event Communications
**Trigger**: Manually sent by event organizers
**Recipients**: Filtered event participants (all, registered, attended, members, guests)
**Content**: Custom messages from organizers
**API Endpoint**: `POST /api/email/bulk`

## PDF Ticket Generation

### Features
- Professional ticket design with EventValidate branding
- Event details (name, date, time, location)
- Participant information
- QR code for validation
- Security watermark
- Important instructions
- Organization branding

### Ticket Contents
- **Header**: EventValidate branding
- **Event Information**: Name, date, time, location
- **Participant Details**: Name, registration ID
- **QR Code**: For event entry validation
- **Instructions**: Important event guidelines
- **Footer**: Contact information and timestamp

## API Endpoints

### Test Email Functionality
```http
POST /api/email/test
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "email": "test@example.com",
  "subject": "Test Email",
  "message": "This is a test message",
  "isHtml": false
}
```

### Send Bulk Email
```http
POST /api/email/bulk
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "eventId": "event_id_here",
  "subject": "Important Update",
  "message": "Hello {name}, this is about {event}",
  "isHtml": false,
  "recipientType": "all"
}
```

### Get Email Queue Status
```http
GET /api/email/queue-status
Authorization: Bearer {admin_token}
```

### Schedule Event Reminders
```http
POST /api/email/event-reminders/:eventId
Authorization: Bearer {admin_token}
```

## Email Templates

### Organization Approval Template
- Professional welcome message
- Login instructions
- Dashboard access link
- Contact information
- Next steps guidance

### Event Reminder Template
- Event details prominently displayed
- Smart timing messages ("Tomorrow", "1 hour left", etc.)
- Location and timing information
- Important instructions
- Event access links

### Payment Success Template
- Payment confirmation
- Transaction details
- Event information
- Receipt information
- Next steps

### Registration Confirmation Template
- Welcome message
- Event details
- QR code embedded
- PDF ticket attached
- Important instructions
- Contact information

## Notification Queue System

### Features
- Asynchronous email processing
- Automatic retry mechanism
- Priority-based sending
- Queue monitoring
- Error handling and logging

### Priority Levels
- **High**: Payment confirmations, registration confirmations
- **Medium**: Event reminders, organization communications
- **Low**: General notifications

### Queue Processing
- Processes every 30 seconds
- Immediate processing for high-priority emails
- Automatic retry with 5-minute delay on failure
- Failed email logging for debugging

## Customization Options

### Email Templates
All email templates are in `server/services/email-service.ts` and can be customized:
- HTML structure and styling
- Branding colors and logos
- Content and messaging
- Footer information

### PDF Tickets
PDF generation is in `server/services/pdf-service.ts`:
- Layout and design
- Colors and branding
- Content sections
- QR code positioning
- Security features

## Monitoring and Debugging

### Email Logs
- All email activities logged to console
- Success/failure status tracking
- Queue processing information
- Error details for debugging

### Queue Status Monitoring
Check email queue status via API:
```javascript
GET /api/email/queue-status
// Returns: { pending: number, processing: boolean }
```

### Testing Email Service
Use the test endpoint to verify configuration:
```javascript
POST /api/email/test
{
  "email": "your-test@example.com",
  "subject": "Test Subject",
  "message": "Test message content"
}
```

## Security Considerations

### Environment Variables
- Never commit email credentials to version control
- Use strong, unique passwords for email accounts
- Consider using app-specific passwords where available

### Email Content
- All emails include unsubscribe information
- Professional branding maintained
- No sensitive information in subject lines
- Secure handling of attachments

### Data Protection
- Participant email addresses protected
- No sharing of personal information
- GDPR-compliant email practices
- Secure attachment handling

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check environment variables are set
   - Verify SMTP credentials
   - Test connection manually

2. **Emails not sending**
   - Check queue status via API
   - Review console logs for errors
   - Verify recipient email addresses

3. **PDF generation failures**
   - Check available memory
   - Verify QR code data format
   - Review PDF service logs

4. **SMTP connection errors**
   - Verify host and port settings
   - Check firewall restrictions
   - Confirm authentication credentials

### Performance Optimization

1. **Queue Management**
   - Monitor queue size regularly
   - Adjust processing interval if needed
   - Implement queue persistence for reliability

2. **PDF Generation**
   - Cache frequently used assets
   - Optimize image sizes
   - Consider background processing for large batches

3. **Email Delivery**
   - Monitor bounce rates
   - Implement delivery confirmations
   - Use email service analytics

## Integration Examples

### Frontend Integration
```javascript
// Send bulk email to event participants
const response = await api.post('/api/email/bulk', {
  eventId: 'event123',
  subject: 'Event Update',
  message: 'Important information about {event}',
  recipientType: 'registered'
});
```

### Backend Integration
```javascript
// Trigger registration confirmation
await notificationService.notifyRegistrationSuccess({
  registration: registrationData,
  event: eventData,
  qrCode: qrCodeImage
});
```

## Best Practices

### Email Content
- Keep subject lines clear and concise
- Use personalization tokens ({name}, {event})
- Include clear call-to-action buttons
- Maintain consistent branding

### Delivery Timing
- Schedule reminders appropriately
- Avoid peak email hours
- Consider recipient time zones
- Respect unsubscribe requests

### Error Handling
- Implement graceful failure handling
- Log all email activities
- Provide fallback mechanisms
- Monitor delivery rates

This comprehensive email system ensures professional communication across all EventValidate workflows while maintaining security and reliability.