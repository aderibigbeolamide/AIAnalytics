# EventValidate - AI-Powered Member Validation System

## Overview

EventValidate is a full-stack web application built for organizations to validate member attendance at events using AI-powered QR code scanning. The system enables administrators to manage members, create events, and track attendance efficiently through an intelligent validation process.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: Zustand for global state (authentication)
- **UI Framework**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with CSS variables for theming
- **Data Fetching**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: JWT tokens with bcrypt password hashing
- **API**: RESTful API with Express middleware

### Database Schema
The system uses PostgreSQL with the following core entities:
- **Users**: Authentication and role management (admin, member, guest, invitee)
- **Members**: Detailed member profiles with auxiliary body classification
- **Events**: Event management with eligibility rules
- **Event Registrations**: Links members to events with QR codes
- **Attendance**: Tracks actual event attendance through scanning
- **Invitations**: Manages guest and invitee access

## Key Components

### Authentication System
- **JWT-based authentication** with 7-day token expiration
- **Role-based access control** supporting multiple user types
- **Password hashing** using bcrypt with salt rounds
- **Persistent authentication** state using Zustand with localStorage

### QR Code Management
- **QR code generation** using crypto-based random strings
- **QR image generation** with configurable error correction
- **Data encryption/decryption** for secure QR payload transmission
- **Validation logic** with timestamp checking and data integrity

### Member Management
- **Comprehensive member profiles** including personal and organizational data
- **Auxiliary body classification** (Atfal, Khuddam, Lajna, Ansarullah, Nasra)
- **Search and filtering** capabilities by auxiliary body and text search
- **Role-based data access** with proper authorization

### Event Management
- **Event creation and management** with eligibility rules
- **Auxiliary body filtering** for targeted events
- **Guest and invitee support** with configurable permissions
- **Status tracking** (upcoming, active, completed, cancelled)

## Data Flow

1. **Authentication Flow**: User credentials → JWT validation → Role-based route access
2. **Member Registration**: Admin creates member → Database storage → QR code generation
3. **Event Creation**: Admin defines event → Eligibility rules → Member notifications
4. **QR Scanning**: Scanner reads QR → Data decryption → Validation → Attendance recording
5. **Dashboard Updates**: Real-time statistics → Query invalidation → UI refresh

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM with PostgreSQL adapter
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **zustand**: Minimal state management library

### UI and Styling
- **@radix-ui/***: Comprehensive accessible UI component library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant management
- **lucide-react**: Icon library

### Security and Utilities
- **bcrypt**: Password hashing and comparison
- **jsonwebtoken**: JWT token generation and verification
- **qrcode**: QR code image generation
- **zod**: Runtime type validation and schema parsing

## Deployment Strategy

### Development Environment
- **Vite dev server** with HMR for frontend development
- **tsx** for TypeScript execution in development
- **Express middleware** for API development with request logging

### Production Build
- **Vite build** for optimized frontend bundle
- **esbuild** for server-side TypeScript compilation
- **Static file serving** through Express with proper caching headers
- **Environment variable configuration** for database and JWT secrets

### Database Management
- **Drizzle Kit** for schema migrations and database synchronization
- **Connection pooling** through Neon's serverless architecture
- **Environment-based configuration** with validation

## QR Code Flow Implementation

### Complete Event Validation Workflow:

1. **Event Creation & QR Generation**
   - Admin creates event through dashboard
   - System automatically generates Event QR Code linking to registration page (/register/[event-id])
   - Event QR code displayed in dashboard with QR button

2. **User Registration Process**
   - Users scan Event QR code or access registration link directly
   - Public registration form with fields: Name, Jamaat, Auxiliary Body, Chanda/Wassiya number, Circuit, Email
   - Support for Members, Guests, and Invitees registration types
   - Form validates auxiliary body eligibility against event requirements

3. **Personal QR Code Generation**
   - After successful registration, system generates encrypted personal QR code
   - QR code contains: registration ID, event ID, member ID, registration type, timestamp
   - Personal QR code displayed immediately to user for saving/printing

4. **Event Validation**
   - Admin/staff scan personal QR codes at event entrance
   - System decrypts and validates QR data
   - Checks registration validity, auxiliary body eligibility, and timestamp
   - Records attendance and updates registration status to "attended"

### Key Features:
- **Two-tier QR system**: Event QR (registration link) + Personal QR (validation)
- **Encrypted QR data** with timestamp validation (24-hour expiry)
- **Role-based access control** with admin authentication
- **Auxiliary body validation** ensuring only eligible members attend
- **Real-time dashboard** with event management and statistics

## Local Development Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Git for version control

### Setup Instructions

1. **Clone and Install**
   ```bash
   # Clone the repository
   git clone <your-repo-url>
   cd eventvalidate
   
   # Install dependencies
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/eventvalidate
   
   # JWT Security
   JWT_SECRET=your-very-secure-jwt-secret-key-here
   
   # Application Environment
   NODE_ENV=development
   PORT=5000
   
   # Application Domain (for link generation)
   APP_DOMAIN=http://localhost:5000
   
   # Email Configuration (Optional)
   SMTP_HOST=smtp.your-email-provider.com
   SMTP_PORT=587
   SMTP_USER=your-email@domain.com
   SMTP_PASS=your-email-password
   
   # Security Keys
   ENCRYPTION_KEY=your-32-character-encryption-key-here
   ```

3. **Database Setup**
   ```bash
   # Initialize database schema
   npm run db:push
   
   # Create admin user
   npm run seed
   
   # Optional: Open database studio
   npm run db:studio
   ```

4. **Development Server**
   ```bash
   # Start development server (frontend + backend)
   npm run dev
   ```
   Access the application at: `http://localhost:5000`

### Local Testing
- **Admin Login**: username: `admin`, password: `password123`
- **Event Management**: Create events, manage registrations
- **QR Code Flow**: Test registration → QR generation → validation
- **Reports**: Submit and review event reports

## Production Deployment

### Environment Variables for Production
```bash
# Required
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/eventvalidate_prod
JWT_SECRET=super-secure-production-jwt-secret
NODE_ENV=production

# Application Domain (CRITICAL for link generation)
APP_DOMAIN=https://your-domain.com

# Optional but recommended
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-app@domain.com
SMTP_PASS=app-password

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Deployment Options

#### 1. **Render (Recommended)**
```bash
# Build command: npm install && npm run build
# Start command: npm start
# Environment: Node.js 20
```

#### 2. **Railway**
```bash
# Auto-detects Node.js
# Set environment variables in dashboard
# Connects to Railway PostgreSQL automatically
```

#### 3. **Heroku**
```bash
# Add buildpack: heroku/nodejs
# Configure environment variables
# Add PostgreSQL addon
```

#### 4. **VPS/Self-Hosted**
```bash
# Build the application
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name eventvalidate

# Configure reverse proxy (nginx)
```

### Frontend-Backend Communication

#### Development (localhost:5000)
- Frontend and backend run on same port
- Vite proxy handles API requests
- No CORS configuration needed

#### Production Deployment
The application is designed as a **single-origin setup**:

1. **Built Frontend**: Static files served by Express
2. **API Routes**: Same server handles `/api/*` requests
3. **Single Domain**: No CORS issues

**Production Structure:**
```
Production Server (domain.com)
├── Static Files (/) → React frontend
├── API Routes (/api/*) → Express backend
└── Public Routes (/register/*, /report/*) → Registration forms
```

**Environment-Specific URLs:**
- Development: `http://localhost:5000`
- Production: `https://your-domain.com`

### Post-Deployment Setup

1. **Create Admin User**
   ```bash
   # SSH into production server
   npm run seed
   ```

2. **Test Core Features**
   - Admin login and dashboard
   - Event creation
   - Registration flow
   - QR code generation
   - Report submission

3. **Configure Email (Optional)**
   - Set SMTP environment variables
   - Test registration confirmation emails

### Database Migration
For production updates:
```bash
# Update schema
npm run db:push

# Run migrations if needed
npm run migrate
```

### Default Admin Account
- **Username**: admin
- **Password**: password123
- Change immediately after first login through the system settings

## Changelog
- June 30, 2025. Initial setup
- July 2, 2025. Complete QR validation workflow implemented
- July 3, 2025. Added event soft-delete functionality and invitation post assignments
- July 3, 2025. Implemented all missing features: Export Attendance, Analytics, Member Management, Event Management, Reports, System Settings
- July 4, 2025. Enhanced validation system with multiple verification methods:
  - Shortened unique IDs (6-character alphanumeric) for easier manual input
  - CSV member import for additional validation layer
  - Face recognition photo upload capability
  - Payment receipt upload for paid events
  - Event end date validation to prevent late registrations
  - Status change to "online" after successful validation
  - Public event report form with automatic link generation
- July 4, 2025. Successfully migrated application from Replit Agent to Replit environment:
  - Fixed all authentication issues with proper apiRequest usage
  - Resolved TypeScript errors in event detail pages and validation components
  - Ensured all API endpoints work correctly with JWT authentication
  - Confirmed admin login functionality (admin/password123)
  - Validated CSV validation and face recognition features are accessible in event details
  - All routing and navigation issues resolved
- July 6, 2025. Database integration and mobile navigation improvements:
  - Added PostgreSQL database with complete schema migration
  - Implemented mobile hamburger navigation menu with responsive design
  - Successfully seeded database with default admin account
  - All features now using persistent database storage instead of memory
- July 6, 2025. Event registration timing controls:
  - Updated registration timing logic: users can only register DURING events (not before they start)
  - Registration is blocked until event start date/time is reached
  - Registration remains open during the event but closes when event ends
  - Both frontend and backend now enforce "no registration before event starts" policy
  - Simplified validation to use event start/end dates directly
- July 6, 2025. Authentication and file upload fixes:
  - Fixed authentication token storage mismatch between frontend storage and API request headers
  - Resolved login functionality - admin account now accessible (admin/password123)
  - Updated file upload filter to accept CSV files for member validation feature
  - System now supports image, PDF, and CSV file uploads
- July 6, 2025. Enhanced validation system with smart CSV-based member verification:
  - Implemented intelligent CSV validation that only applies to members when CSV data exists
  - Members registering as "member" must be found in uploaded CSV files to be validated
  - Guests and invitees can be validated regardless of CSV content (bypass CSV requirement)
  - Events without CSV files allow all registration types to be validated normally
  - Enhanced both QR scan and manual ID validation with consistent logic
  - Improved error messages to clearly explain validation requirements
  - Default admin credentials confirmed: username=admin, password=password123
- July 6, 2025. PostgreSQL database integration completed:
  - Created and configured PostgreSQL database with all required environment variables
  - Successfully pushed database schema using Drizzle migrations
  - Seeded database with default admin user account
  - All features now using persistent PostgreSQL storage instead of in-memory storage
  - Database connection verified and operational
- July 7, 2025. Migration from Replit Agent to Replit environment completed:
  - Successfully migrated project from Replit Agent to standard Replit environment
  - Fixed registration form validation errors preventing user registration
  - Resolved FormData construction issues causing empty firstName/lastName submission
  - Added comprehensive client and server-side validation for required fields
  - Corrected payment receipt requirement logic - now only shows when event requires payment
  - Database properly configured with PostgreSQL integration
  - All authentication and core features confirmed working
  - Registration workflow fully functional with proper error handling
  - Application running successfully on port 5000 with admin access (admin/password123)
  - Enhanced dashboard stats to show accurate member counts and registration statistics
  - CSV validation system tested and working with sample data upload
  - Member management system displaying all registered users properly
- July 9, 2025. Complete system enhancement and fixes:
  - Fixed login whitespace trimming for more reliable authentication
  - Added separate registration date fields to clarify event dates vs registration periods
  - Implemented flexible auxiliary body management - creators can add/remove custom groups
  - Enhanced camera functionality with fallback options for QR scanning
  - Added numeric input validation to prevent text entry in number fields
  - Improved QR scanner with better camera permission handling and error messages
  - Database schema updated to support registration start/end dates
  - All core issues resolved and application fully functional
- July 9, 2025. Migration to Replit environment completed:
  - Successfully migrated from Replit Agent to standard Replit environment
  - Created and configured PostgreSQL database with proper environment variables
  - Pushed database schema and seeded with default admin user (admin/password123)
  - Enhanced registration forms with prominent registration period display
  - Added visual registration period information cards for better user awareness
  - Fixed QR code generation and display issues in registration cards
  - All workflow and development tools configured and tested
  - Application fully functional with secure database integration and working QR codes
- July 9, 2025. Implemented Personalized Event Countdown Timer feature:
  - Created comprehensive countdown timer component with real-time updates
  - Added countdown displays for upcoming events (days, hours, minutes, seconds)
  - Integrated live event tracking with visual indicators
  - Added personalized "My Events" page for user registration tracking
  - Enhanced dashboard with countdown timers for upcoming and live events
  - Added countdown timer to individual event detail pages
  - Created API endpoint for user registrations retrieval
  - Countdown timer shows different states: upcoming (blue), live (green), ended (gray)
  - All countdown timers update every second with accurate time calculations
- July 11, 2025. Successfully migrated from Replit Agent to Replit environment with comprehensive UI/UX improvements:
  - Fixed all asset import issues and resolved logoPath errors
  - Set up PostgreSQL database with complete schema migration
  - Created default admin user (admin/password123) and seeded database
  - Implemented comprehensive landing page redesign with modern UI
  - Enhanced visual hierarchy with custom color palette and typography
  - Added Google Analytics integration with page tracking
  - Improved accessibility with focus styles and ARIA attributes
  - Created responsive design with mobile-first approach
  - Added testimonials section with social proof
  - Enhanced CTA strategy with clear value propositions
  - Implemented better content clarity and copywriting
  - Added comprehensive "How It Works" section
  - Enhanced pricing section with improved visual design
  - All features now fully functional with persistent PostgreSQL storage
- July 15, 2025. Completed migration to Replit environment with flexible registration system:
  - Successfully migrated from Replit Agent to standard Replit environment
  - Created and configured PostgreSQL database with schema migration
  - Seeded database with default admin user (admin/password123)
  - Fixed dashboard runtime errors with proper array checking
  - Implemented completely flexible registration system removing all hardcoded values
  - Created dynamic registration form with customizable fields
  - Removed hardcoded auxiliary bodies, jamaat, and circuit restrictions
  - Event creators can now add/remove any auxiliary body types
  - Registration forms adapt dynamically to event configuration
  - All field types now configurable: text, email, number, select, file, textarea
  - Enhanced form validation with dynamic schema generation
  - Improved user experience with registration period indicators
  - Fixed PostgreSQL auxiliary body query using jsonb_array_elements_text
  - Updated member management to remove hardcoded Chanda and Jamaat columns
  - Made registration forms completely flexible without hardcoded field requirements
  - All migration checklist items completed successfully
- July 16, 2025. Final migration completion with feature testing:
  - Successfully completed migration from Replit Agent to Replit environment
  - Database fully operational with PostgreSQL backend
  - All core features working: authentication, event management, registration
  - CSV validation feature uploaded and tested (needs FirstName/LastName format fix)
  - Face recognition feature tested and operational (camera optimization needed)
  - Application running stable on port 5000 with all dependencies installed
- July 18, 2025. Integrated Paystack payment system with flexible payment configuration:
  - Added comprehensive payment settings to event creation form with user-friendly interface
  - Integrated Paystack test credentials (secret: sk_test_5ba5b29d1e3ec263, public: pk_test_e3492bece8a7b8ac688b7d576471a64f8e1c6955)
  - Created flexible payment rules system allowing event creators to specify who must pay (members, guests, invitees, or combinations)
  - Implemented both online Paystack payments and manual receipt upload options
  - Added payment verification system with automatic registration completion after successful payment
  - Created user-friendly payment callback page with success/failure states and proper navigation
  - Updated database schema to support payment settings, references, and status tracking
  - Added payment initialization and verification API endpoints for seamless integration
  - Enhanced registration forms with dynamic payment method selection based on event settings
  - System now supports multiple currencies (NGN, USD, GBP, EUR) with proper conversion to kobo for Paystack

## User Preferences

Preferred communication style: Simple, everyday language.
UI/UX preferences: User-friendly design with professional appearance, no demo credentials on login page, direct users to contact admin for login issues.