# EventValidate - AI-Powered Member Validation System

## Overview
EventValidate is an AI-powered, multi-tenant member validation system designed to streamline event operations and member engagement for various organizations. It offers comprehensive event management, member validation, QR code scanning, a robust ticket system, payment processing, and real-time notifications. The platform supports a dual-admin architecture, enabling super admin oversight and organization-specific administration. Its vision is to provide a seamless and efficient solution for managing events and member interactions, targeting a broad market of organizations needing advanced validation and event management capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: User-friendly design with professional appearance, no demo credentials on login page, direct users to contact admin for login issues.

## Recent Changes (August 2025)
- **Successfully migrated from Replit Agent to standard Replit environment** (August 6, 2025)
- **Migration verification completed**: All core features working including authentication, MongoDB connection, Cloudinary file storage, event management, and landing page functionality
- Fixed landing page event card navigation issue: corrected `/event/${id}` to `/event-view/${id}` route
- All workflows and dependencies confirmed working properly
- MongoDB connection and auto-seeding functioning correctly
- **Fixed FullName Field Handling**: Updated event registration system to properly handle events using FullName fields instead of separate firstName/lastName fields. Modified backend parsing logic and MongoDB schema to support both naming conventions seamlessly. Users can now create events with FullName fields and registration will work correctly by automatically splitting the full name into firstName and lastName components.
- **Fixed Super Admin Event Oversight**: Resolved ObjectId casting errors and corrected function parameter calls for event registration counting
- **Enhanced Event Statistics Display**: Updated event cards to show meaningful statistics for ticket-based events (Paid/Pending/Failed instead of Members/Guests/Invitees)
- **Improved Ticket-Based Event Details**: Added comprehensive ticket purchaser view showing payment status, categories, and breakdown for ticket-based events
- **Fixed Event Details API**: Updated backend to properly calculate and display ticket sales statistics on event cards
- **Fixed Ticket System Issues**: Resolved QR code generation for manual payments, PDF download functionality, and payment initialization from ticket lookup
- **Added Manual Payment Verification**: Created endpoint for admin verification of manual ticket payments with automatic QR code generation
- **Fixed Payment Display Issues**: Resolved frontend/backend authorization URL mismatch, QR code display issues, and PDF generation problems
- **Confirmed Admin Payment Tracking**: Verified that admin dashboard properly tracks all user payments through event tickets and registration systems
- **Implemented Event Reminder Notifications**: Created comprehensive reminder system with automatic email/in-app notifications sent 7 days, 3 days, 1 day, 24 hours, and 2 hours before events. Includes manual reminder controls for admins and statistics dashboard.
- **Enhanced Configurable Event Reminders**: Updated event creation form to allow admins to fully customize reminder settings including specific days/hours before event, custom messages, notification methods (email/in-app), and reminder titles. Admins can now specify exactly when and how participants receive reminders.
- **Updated Manual Verification and Registration ID Display** (August 6, 2025): Modified manual verification code generation to use alphabetic codes (A-Z) for secured registration events while keeping numeric codes for ticket-based events. Completely removed Registration ID display from all pages and event types as it serves no functional purpose, improving user interface clarity.
- **Resolved Critical Registration and Validation Bug** (August 6, 2025): Fixed major issue where secured registration events were not properly saving user registrations to MongoDB and manual verification codes were stored incorrectly. Updated payment validation logic to properly handle "not_required" payment status for registration-based events. Registration and validation flow now working end-to-end for secured events.
- **Fixed Payment Status Display and Validation Issues** (August 6, 2025): Corrected frontend payment status display to show proper badges (Paid/Not Required/Pending) instead of "No payment" for all registrations. Updated validation logic to accept both "paid" and "not_required" payment statuses. Validation system now properly recognizes and validates manual verification codes for both existing and new registrations.
- **Verified Manual Verification Code System** (August 6, 2025): Confirmed complete implementation of event-type-specific verification codes: secured registration events generate 6-character alphabetic codes (A-Z) like "YANCRP", while ticket-based events generate 6-digit numeric codes. Validation system successfully recognizes and processes both code types for manual entry validation. End-to-end testing confirms full functionality for both registration and ticket validation workflows.
- **Fixed Registration Validation Bug During Migration** (August 6, 2025): Resolved critical issue where manual verification codes were not being found during validation. Updated `getEventRegistrationByUniqueId` function to search in all possible code storage locations: `uniqueId`, `registrationData.manualVerificationCode`, and root-level `manualVerificationCode`. Generated missing verification codes for existing registrations using super admin credentials. Registration validation now works correctly for all code types and storage formats.
- **Completed Migration from Replit Agent to Standard Environment** (August 6, 2025): Successfully migrated the entire EventValidate system from Replit Agent to standard Replit environment. All core features confirmed working including authentication, MongoDB connection, Cloudinary file storage, event management, validation system, payment processing, and notification system. Generated missing manual verification codes for all existing registrations. System fully operational and ready for production use.

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
- **Dual-Admin Architecture**: Features a super admin for system oversight and organization-specific admins for tenant management.
- **Multi-Tenant System**: Ensures complete organization isolation with dedicated dashboards and payment routing capabilities.
- **Comprehensive Event System**: Supports both traditional registration-based events with advanced validation (e.g., QR, manual) and simplified ticket-based events.
- **Robust Authentication**: Implements JWT-based, role-based access control with secure password hashing.
- **AI-Powered Features**: Includes AI-driven solutions such as a seat availability heatmap for real-time capacity visualization and an event recommendation engine for personalized suggestions.
- **Notification System**: Provides real-time in-app notifications with broadcasting and targeted messaging.
- **Event Reminder System**: Automated email and in-app reminders sent to event participants at configurable intervals (7 days, 3 days, 1 day, 24 hours, 2 hours before events).
- **QR Code Management**: Handles secure generation, encryption, and validation of QR codes for event access.
- **UI/UX Design**: Prioritizes a clean, professional, and accessible user interface with responsive design principles.
- **Payment System**: Integrates with Paystack to support flexible payment rules, direct organizer payments via subaccounts, and platform revenue sharing.
- **Bank Account Management**: Facilitates secure setup and verification of Nigerian bank accounts for organizations.

## External Dependencies
- **Database**:
    - `mongodb`
    - `mongoose`
- **API/Payment**:
    - `paystack`
- **Frontend/UI**:
    - `@radix-ui/*`
    - `tailwindcss`
    - `lucide-react`
    - `@tanstack/react-query`
    - `wouter`
    - `zustand`
- **Security/Utilities**:
    - `bcrypt`
    - `jsonwebtoken`
    - `qrcode`
    - `zod`
    - `OpenAI API`
    - `Cloudinary`
    - `Google Tag Manager (GTM)`
    - `jspdf`
    - `html2canvas`
```