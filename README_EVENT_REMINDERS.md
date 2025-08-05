# Event Reminder System - Implementation Guide

## Overview
The EventValidate system now includes a comprehensive event reminder notification system that automatically sends reminders to event participants via email and in-app notifications.

## Features Implemented

### 1. **Automatic Reminder Processing**
- **Default Schedule**: 7 days, 3 days, 1 day, 24 hours, and 2 hours before events
- **Email Notifications**: HTML-formatted emails with event details and QR codes
- **In-App Notifications**: Real-time notifications in the admin dashboard
- **Duplicate Prevention**: Smart detection to avoid sending the same reminder multiple times

### 2. **Manual Reminder Controls**
- **Admin Dashboard**: `/event-reminders` page for admins and super admins
- **Custom Timing**: Send reminders with custom time descriptions
- **Event Selection**: Choose specific events to send reminders for
- **Bulk Processing**: Process all pending reminders at once

### 3. **Reminder Statistics**
- **Upcoming Events**: Count of events in the next 7 days
- **24-Hour Events**: Events starting within 24 hours
- **Weekly Overview**: Events scheduled for the current week
- **Event Type Breakdown**: Distribution by registration vs ticket events

## API Endpoints

### For Admins:
- `GET /api/events/upcoming-reminders` - Get events needing reminders
- `POST /api/events/:eventId/send-reminder` - Send manual reminder
- `GET /api/events/reminder-stats` - Get reminder statistics

### For System/Cron:
- `POST /api/system/process-reminders` - Process all pending reminders

## Files Created/Modified

### Backend Files:
1. **`server/event-reminder-service.ts`** - Core reminder processing logic
2. **`server/event-reminder-routes.ts`** - API endpoints for reminder management
3. **`scripts/reminder-scheduler.ts`** - Cron job script for automatic processing

### Frontend Files:
1. **`client/src/components/EventReminders.tsx`** - Main reminder management UI
2. **`client/src/pages/event-reminders.tsx`** - Dedicated page for admins
3. **Updated `client/src/App.tsx`** - Added route for event reminders page

### Integration:
- **`server/index.ts`** - Registered reminder routes

## Usage Instructions

### For Administrators:

1. **Access the Reminder Dashboard**:
   ```
   Navigate to: /event-reminders
   ```

2. **View Statistics**:
   - See upcoming events count
   - Monitor events within 24 hours
   - Check weekly event distribution
   - Review event types breakdown

3. **Send Manual Reminders**:
   - Select an event from the dropdown
   - Choose time remaining description (e.g., "2 hours", "1 day")
   - Click "Send Reminder"

4. **Process All Reminders**:
   - Click "Process All Reminders" to trigger system-wide processing

### For System Administration:

1. **Set Up Cron Job** (Recommended every 2 hours):
   ```bash
   # Add to crontab (crontab -e)
   0 */2 * * * /usr/bin/npx tsx /path/to/eventvalidate/scripts/reminder-scheduler.ts
   ```

2. **Manual Processing**:
   ```bash
   # Run the scheduler script manually
   npx tsx scripts/reminder-scheduler.ts
   ```

3. **Environment Variables**:
   ```env
   SYSTEM_API_KEY=your-secure-system-key
   APP_DOMAIN=https://your-domain.com
   EMAIL_FROM=noreply@yourdomain.com
   ```

## Reminder Content

### Email Features:
- **Professional HTML Template**: Gradient headers, event cards, and styled content
- **Event Details**: Date, time, location, description
- **QR Code Integration**: Ticket QR codes embedded in emails (for ticket events)
- **Call-to-Action**: Direct links to event details
- **Important Reminders**: Check-in instructions and requirements

### In-App Notifications:
- **Priority Levels**: High priority for hour-based reminders, medium for day-based
- **Action URLs**: Direct links to event management
- **Auto-Expiry**: Notifications expire 24 hours after event completion
- **Organization Scope**: Notifications sent to organization admins

## Customization Options

### Reminder Schedule:
Modify the `ReminderSettings` in `event-reminder-service.ts`:
```typescript
const reminderSettings: ReminderSettings = {
  emailEnabled: true,
  inAppEnabled: true,
  beforeEventDays: [7, 3, 1], // Customize day intervals
  beforeEventHours: [24, 2]   // Customize hour intervals
};
```

### Email Templates:
Edit the `generateReminderEmailHTML` method in `event-reminder-service.ts` to customize:
- HTML styling and layout
- Content sections
- Call-to-action buttons
- Branding elements

### Notification Categories:
Reminders are categorized as 'events' type with:
- **Type**: `event_reminder`
- **Category**: `events`
- **Priority**: `high` (hours) or `medium` (days)

## Integration with Existing Features

### Event Types Supported:
- **Registration Events**: Sends reminders to EventRegistration participants
- **Ticket Events**: Sends reminders to paid Ticket holders

### Authentication:
- Uses existing JWT authentication system
- Requires admin or super_admin role for manual controls
- System endpoints use API key authentication

### Database Schema:
- Uses existing `EventRegistration` and `Ticket` collections
- Creates notifications in the `Notification` collection
- No new database collections required

## Monitoring and Debugging

### Logs:
The system provides comprehensive logging:
```bash
# Check reminder processing logs
tail -f logs/app.log | grep "reminder"

# Monitor email sending
tail -f logs/app.log | grep "Email sent"
```

### Error Handling:
- Failed email deliveries are logged but don't stop processing
- Duplicate reminder detection prevents spam
- API endpoint errors provide detailed error messages

## Security Considerations

1. **API Key Protection**: System endpoints require `SYSTEM_API_KEY`
2. **Rate Limiting**: Built-in duplicate prevention
3. **Role-Based Access**: Admin/super_admin only for manual controls
4. **Data Privacy**: Reminders only include event information, not personal data

## Future Enhancements

Potential improvements for future versions:
1. **SMS Reminders**: Integration with SMS providers
2. **Custom Templates**: Per-organization email templates
3. **Advanced Scheduling**: Custom reminder intervals per event
4. **Analytics**: Reminder open rates and engagement tracking
5. **User Preferences**: Allow users to opt-out or customize reminder frequency

---

## Facial Recognition Implementation Guide

For your question about facial recognition for secured event registration (not tickets), here's how to implement it with your current architecture:

### Current Schema Support
Your `EventRegistration` interface already includes:
```typescript
facePhotoPath?: string; // Already exists - stores path to uploaded face photo
```

### Implementation Approach

#### 1. **Registration Phase** (Add to existing registration):
```typescript
// Modify POST /api/events/:id/register to include face photo upload
app.post("/api/events/:id/register", 
  facePhotoUpload.single('facePhoto'), // Add multer middleware
  async (req: Request, res: Response) => {
    // ... existing registration logic
    
    let facePhotoPath;
    if (req.file) {
      facePhotoPath = req.file.path;
    }
    
    const registration = new EventRegistration({
      // ... existing fields
      facePhotoPath,
    });
    
    await registration.save();
  }
);
```

#### 2. **Validation Phase** (At event entrance):
```typescript
// New endpoint: POST /api/events/:eventId/verify-face
app.post("/api/events/:eventId/verify-face", 
  facePhotoUpload.single('livePhoto'),
  async (req: Request, res: Response) => {
    const { registrationId } = req.body;
    
    const registration = await EventRegistration.findById(registrationId);
    if (!registration.facePhotoPath) {
      return res.status(400).json({ message: "No reference photo" });
    }
    
    // Compare faces using your chosen method
    const result = await compareFacePhotos(
      registration.facePhotoPath,
      req.file.path
    );
    
    if (result.isMatch) {
      registration.validatedAt = new Date();
      await registration.save();
    }
    
    res.json(result);
  }
);
```

#### 3. **Technology Options**:

**Option A: Browser-based (face-api.js)**
- Real-time processing in browser
- Privacy-friendly (no server uploads for comparison)
- Good for basic verification

**Option B: Server-based (Python/OpenCV)**
- More accurate recognition
- Handles difficult lighting conditions
- Better for high-security events

**Option C: Cloud APIs (AWS Rekognition, Azure Face)**
- Professional-grade accuracy
- Handles all edge cases
- Requires API costs and external dependencies

### Recommended Implementation Steps:

1. **Start Simple**: Use face-api.js for quick implementation
2. **Enhance Frontend**: Add camera capture to registration forms
3. **Add Validation**: Create face verification endpoint
4. **Improve Security**: Add confidence thresholds and manual override
5. **Scale Up**: Move to server-based processing when needed

The key advantage is that your EventRegistration schema is already prepared for this feature!