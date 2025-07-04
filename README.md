# EventValidate - AI-Powered Member Validation System

A comprehensive event management and validation system with QR code scanning, member management, and reporting capabilities.

## Features

- **Event Management**: Create and manage events with auxiliary body filtering
- **QR Code Registration**: Automatic QR generation for event validation
- **Member Validation**: Multiple validation methods (QR scan, manual ID, CSV import)
- **Payment Receipt Upload**: Image upload for paid events
- **Report Management**: Public feedback forms with admin review system
- **Dashboard Analytics**: Real-time event and attendance statistics

## Quick Start

### Local Development

1. **Auto Setup** (Recommended)
   ```bash
   node setup-local.js
   npm run dev
   ```

2. **Manual Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Create .env file with your database URL
   echo "DATABASE_URL=postgresql://user:pass@localhost:5432/eventvalidate" > .env
   echo "JWT_SECRET=your-secret-key" >> .env
   
   # Setup database
   npm run db:push
   npm run seed
   
   # Start development server
   npm run dev
   ```

3. **Access Application**
   - URL: http://localhost:5000
   - Admin Login: `admin` / `password123`

### Production Deployment

#### Render (Recommended)
1. Connect your Git repository
2. Set build command: `npm install && npm run build`
3. Set start command: `npm start`
4. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Secure random string
   - `NODE_ENV`: production

#### Other Platforms
- **Railway**: Auto-detects Node.js, add PostgreSQL addon
- **Heroku**: Add Node.js buildpack and PostgreSQL addon
- **VPS**: Use PM2 for process management

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/database
JWT_SECRET=your-super-secure-secret

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with role-based access
- **Deployment**: Single-origin (frontend + backend on same domain)

## Key Workflows

1. **Event Creation** → QR Code Generation → Public Registration Link
2. **User Registration** → Personal QR Code → Payment Receipt Upload
3. **Event Validation** → QR/ID Scanning → Attendance Recording
4. **Report Submission** → Admin Review → Status Updates

## Support

For technical issues or deployment questions, refer to the complete documentation in `replit.md`.

## Security

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Secure file upload handling
- Environment-based configuration