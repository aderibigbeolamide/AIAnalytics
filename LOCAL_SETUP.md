# Local Development Setup Guide

This guide will help you run the EventValidate AI-powered system on your local machine.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Git for version control

## Quick Setup Steps

### 1. Clone and Install Dependencies

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install all dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your database configuration:

```bash
# Database Configuration (Replace with your PostgreSQL URL)
DATABASE_URL=postgresql://username:password@localhost:5432/eventvalidate

# JWT Security
JWT_SECRET=your-very-secure-jwt-secret-key-here

# Application Environment
NODE_ENV=development
PORT=5000

# Application Domain (for link generation)
APP_DOMAIN=http://localhost:5000

# Encryption Key (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Optional: Email Configuration
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# Optional: Paystack Configuration (for payment features)
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

### 3. Database Setup

```bash
# Push database schema
npm run db:push

# Seed with default admin user
npm run seed
```

### 4. Build Frontend

**IMPORTANT**: You must build the frontend before running the server:

```bash
# Build the client-side application
npm run build

# Copy build files to expected server location
cp -r dist/public server/
```

### 5. Start Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at: `http://localhost:5000`

## Default Login Credentials

- **Username**: admin
- **Password**: password123

## Features Available

✅ **Real-time Seat Availability Heatmap**
- Visual event capacity representation
- Color-coded seat sections (Available, Reserved, Occupied, Blocked)
- Auto-refresh capabilities
- Section-wise occupancy statistics

✅ **AI-Powered Event Recommendations**
- Personalized suggestions based on user preferences
- Behavior analysis and match scoring
- Interest-based filtering
- Recommendation reasoning

✅ **Complete Event Management System**
- Event creation and management
- Member registration and validation
- QR code generation and scanning
- Payment processing with Paystack
- Analytics and reporting

## Troubleshooting

### Build Directory Error

If you see: `Could not find the build directory: /path/to/server/public`

**Solution**:
```bash
npm run build
cp -r dist/public server/
```

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Verify your DATABASE_URL in .env file
3. Check database permissions
4. Run `npm run db:push` to sync schema

### Port Already in Use

If port 5000 is busy:
```bash
# Change PORT in .env file or kill existing process
lsof -ti:5000 | xargs kill -9
```

## Development Commands

```bash
# Start development server
npm run dev

# Build production version
npm run build

# Push database schema changes
npm run db:push

# Open database studio
npm run db:studio

# Run database seed
npm run seed
```

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared schema/types
├── dist/           # Built frontend files
└── server/public/  # Static files served by Express
```

## AI Features Demo

Once logged in as admin, navigate to the Dashboard to see:

1. **Event Recommendations Panel** - Shows personalized event suggestions
2. **Seat Heatmap Visualization** - Real-time capacity tracking
3. **Event Management** - Create events with AI-powered features

## Need Help?

1. Check this guide for common issues
2. Verify environment configuration
3. Ensure build step completed successfully
4. Check console logs for specific errors

The system is now ready with AI-powered seat management and personalized recommendations!