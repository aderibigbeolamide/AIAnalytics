# EventValidate - AI-Powered Member Validation System

## Overview
EventValidate is an AI-powered, multi-tenant member validation system. It offers event management, member validation, QR code scanning, a comprehensive ticket system, payment processing, and real-time notifications. The platform supports a dual-admin architecture, allowing for super admin oversight and organization-specific administration, with a vision to streamline event operations and member engagement for various organizations.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: User-friendly design with professional appearance, no demo credentials on login page, direct users to contact admin for login issues.

## Recent Changes (August 2, 2025)
- **Replit Migration**: Successfully migrated project from Replit Agent to Replit environment with proper security practices
- **Payment System Fixes**: 
  - Resolved "registrationData path" error by adding support for existing registration payments
  - Fixed "invalid split configuration" error by correcting Paystack parameter ordering
  - Fixed payment verification logic to update existing registrations instead of creating duplicates
  - Added missing `deleteEventRegistration` method to MongoDB storage interface
  - Configured Paystack API keys for production payment processing
  - Enhanced payment verification logging for better debugging
  - Fixed NotificationService.sendNotification error by correcting method call
- **Paystack Integration**: Successfully configured API keys and validated payment verification endpoints
- **MongoDB Integration**: Confirmed unified MongoDB architecture with proper connection and seeding
- **Client-Server Separation**: Validated proper separation between frontend and backend components
- **Security Implementation**: Ensured secure authentication, payment processing, and API endpoints
- **Environment Setup**: Configured proper TypeScript compilation and workflow management
- **Migration Completion**: Project successfully migrated to Replit environment with all core functionality operational

## System Architecture
### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: Zustand
- **UI**: Radix UI components with shadcn/ui, Tailwind CSS
- **Data Fetching**: TanStack Query
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: MongoDB with Mongoose (MongoDB Atlas)
- **Authentication**: JWT tokens with bcrypt
- **API**: RESTful API
- **File Storage**: Local file system with Cloudinary integration
- **Payment Processing**: Paystack API (multi-tenant support)

### Core Architectural Decisions
- **Dual-Admin Architecture**: Super admin for system oversight, organization admins for specific tenant management.
- **Multi-Tenant System**: Complete organization isolation with dedicated dashboards and payment routing.
- **Comprehensive Event System**: Supports both traditional registration-based events with advanced validation (CSV, face recognition) and simplified ticket-based events.
- **Robust Authentication**: JWT-based, role-based access control with secure password hashing.
- **AI-Powered Features**:
    - **Seat Availability Heatmap**: Real-time visualization of event capacity with color-coding.
    - **Event Recommendation Engine**: AI-driven personalized suggestions based on user preferences and behavior.
- **Notification System**: Real-time in-app notifications with broadcast and targeted messaging capabilities.
- **QR Code Management**: Secure generation, encryption, and validation for event access.
- **UI/UX Design**: Focus on clean, professional appearance with accessible components and responsive design.
- **Payment System**: Integration with Paystack for flexible payment rules, direct organizer payments via subaccounts, and platform revenue sharing (2% fee).
- **Bank Account Management**: Secure setup and verification of Nigerian bank accounts for organizations.

## External Dependencies
- **Database**:
    - `mongodb`: MongoDB database connectivity
    - `mongoose`: MongoDB object modeling
- **API/Payment**:
    - `paystack`: Payment processing and bank verification API
- **Frontend/UI**:
    - `@radix-ui/*`: UI component library
    - `tailwindcss`: CSS framework
    - `lucide-react`: Icon library
    - `@tanstack/react-query`: Server state management
    - `wouter`: React router
    - `zustand`: State management
- **Security/Utilities**:
    - `bcrypt`: Password hashing
    - `jsonwebtoken`: JWT token management
    - `qrcode`: QR code generation
    - `zod`: Runtime type validation
    - `OpenAI API`: AI-powered chatbot functionality
    - `Cloudinary`: File storage
    - `Google Tag Manager (GTM)`: Analytics tracking (GTM-K2CJKNND)
    - `jspdf`, `html2canvas`: PDF generation for tickets
```