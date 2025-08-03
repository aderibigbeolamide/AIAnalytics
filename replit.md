# EventValidate - AI-Powered Member Validation System

## Overview
EventValidate is an AI-powered, multi-tenant member validation system. It offers event management, member validation, QR code scanning, a comprehensive ticket system, payment processing, and real-time notifications. The platform supports a dual-admin architecture, allowing for super admin oversight and organization-specific administration, with a vision to streamline event operations and member engagement for various organizations.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: User-friendly design with professional appearance, no demo credentials on login page, direct users to contact admin for login issues.

## Recent Changes (August 3, 2025)
- **✅ PUBLIC EVENTS LANDING PAGE SECTION CREATED**: 
  - **Events Display Section**: Added comprehensive public events section on landing page showing ongoing and upcoming events
  - **Smart Event Filtering**: Shows events that are currently live (ongoing) and upcoming events, excludes only past events
  - **Event Status Indicators**: Live events show animated "Live Now" badge, upcoming events show "Upcoming" badge
  - **Image Integration**: Uses new EventImage component with default avatars for events without custom images
  - **Navigation Enhancement**: Added "Events" link to main navigation (desktop and mobile)
  - **Responsive Design**: Beautiful grid layout with hover effects, loading states, and empty state handling
  - **Event Details Display**: Shows event name, description, location, date/time, and event type
  - **Call-to-Action**: Direct links to event detail pages for registration
- **✅ FIND MY EVENT FUNCTIONALITY FIXED**: 
  - **API Method Fixed**: Changed `getAllEventRegistrations` to correct `getEventRegistrations` method in MongoDB storage
  - **Error Handling Enhanced**: Added proper error handling and empty array returns for when no registrations found
  - **Organization Registration Route**: Added `/organization-register` route to App.tsx routing system
  - **Dashboard State Variables**: Added missing `manualValidationOpen` state variable and simple manual validation modal
  - **Complete Fix**: "Find my event" feature now returns proper JSON responses instead of 500 errors
- **✅ PROJECT MIGRATION TO REPLIT COMPLETED**: Successfully migrated from Replit Agent to Replit environment
- **✅ ENHANCED DASHBOARD STATISTICS SYSTEM**: 
  - **Comprehensive Event Analytics**: Dashboard now shows detailed event statistics including total, upcoming, completed, and active events
  - **Advanced Validation Metrics**: Real-time validation rates, QR scans today, pending validations, and validated registrations
  - **Trend Analysis**: Weekly trends for events, registrations, and validations with percentage changes
  - **Auxiliary Body Insights**: Detailed breakdown by auxiliary body including validation rates and registration counts
  - **Event Type Analytics**: Statistics breakdown by event type (registration, ticket-based, etc.)
  - **Member Management Dynamic Stats**: Stats cards update based on selected event showing event-specific registration data
- **✅ QR CODE VALIDATION SYSTEM FULLY OPERATIONAL**: 
  - **Enhanced QR Detection**: Upgraded to high-resolution scanning (640x480) with improved algorithms for better code detection
  - **Complete Validation Flow**: QR codes properly detect and extract registration data, validate against database, and update status
  - **Robust Error Handling**: Better feedback for already-validated registrations vs fresh validations
  - **Real-time Processing**: Camera scanning works seamlessly with immediate validation and UI feedback
  - **Status Management**: Proper status transitions from "active" to "online" indicating successful event check-in
- **✅ COMPREHENSIVE AUXILIARY BODY MAPPING FIXED**: 
  - **Universal Field Detection**: Now automatically detects and maps any field with Male/Female options to auxiliaryBody
  - **Multi-Type Support**: Handles select, radio, checkbox, and text fields for gender/auxiliary body selection
  - **Array Value Handling**: Properly processes checkbox arrays by taking the first selected value
  - **Dynamic Field Recognition**: Identifies fields like "Gender", "Student", etc. regardless of field name
  - **Existing Data Updated**: Fixed 26 total registrations to show proper auxiliary body values
- **✅ MANUAL VALIDATION FIXED**: Fixed "event id not found" error by properly handling populated eventId fields in MongoDB queries
- **✅ PDF/PRINT QUALITY ENHANCED**: Improved registration card download and print quality with 3x resolution scaling, maximum PNG quality, and enhanced print CSS
- **✅ REGISTRATION CARD PRINTING ENHANCED**: 
  - **High-Resolution Canvas**: Implemented 3x scaling for crisp print output with maximum PNG quality (1.0)
  - **Comprehensive Print CSS**: Added A4 page size, proper margins, and color-adjust settings for accurate print colors
  - **QR Code Fix**: Fixed QR code rendering issues in downloaded registration cards by correcting canvas dimension references
  - **Professional Print Layout**: Enhanced print styles with proper borders, typography, and spacing for clear physical cards
- **✅ VALIDATION STATUS UPDATES FIXED**: 
  - **Status Change**: Manual validation now correctly updates registration status from "active" to "online" indicating presence
  - **Populated EventId Handling**: Fixed both `/api/validate-id` and `/api/validate` endpoints to handle populated eventId fields correctly
  - **Proper Error Handling**: Enhanced error handling for eventId lookup with fallback support for both populated and string formats
- **✅ MEMBER MANAGEMENT EVENT FILTER ADDED**: 
  - **Event Dropdown Filter**: Added missing event filter dropdown to Member Management page
  - **Event Registration View**: Users can now select specific events to view all registered participants
  - **Status Display**: Shows "Present" for users with "online" status indicating successful validation
  - **Dual View Mode**: Traditional members when "All Members" selected, event registrations when specific event selected
- **✅ REGISTRATION CARD CUSTOMIZATION COMPLETED**: 
  - **Removed Registration ID**: Only displays unique letter-based ID (6-character A-Z format)
  - **Enhanced Visual Design**: Improved layout with gradient backgrounds, better spacing, and professional styling
  - **Improved Information Display**: Better organized contact info, event details, and verification instructions
  - **Dual Access Methods**: Clear separation between QR code scanning and manual ID verification
  - **Client-Side Card Updates**: Updated registration card component to show "Manual Verification ID" instead of "Registration ID"
  - **Email Template Enhancement**: Redesigned email registration card with modern layout, dual-column access methods, and improved instructions
- **✅ REGISTRATION SYSTEM FIXED**: 
  - **Missing Storage Method**: Added `getEventById` method to both MongoDB and in-memory storage interfaces
  - **Registration Validation**: Fixed registration process that was failing due to missing database methods
  - **Form Field Validation**: Proper validation of required custom fields based on event configuration
  - **Error Handling**: Improved error messages for missing required fields during registration
- **✅ VALIDATION SYSTEM COMPLETELY FIXED**: All three validation methods now working perfectly
  - **QR Code Validation**: Fixed MongoDB ObjectId comparison issues by handling populated eventId fields correctly
  - **Manual Verification**: Upgraded to 6-character letter codes (A-Z format) for better user experience
  - **Unique ID Validation**: Fixed uniqueId lookup and validation logic with proper status updates
  - **Status Updates**: All successful validations now set user status to "online" indicating presence at event
  - **Payment Validation**: Added checks to prevent validation for unpaid users in paid events
- **✅ MEMBER MANAGEMENT ENHANCEMENT**: 
  - **Dual Display Mode**: Dashboard now shows both regular members and event registrations based on filter selection
  - **Event Registration View**: When specific event is selected, shows registered participants with their unique IDs
  - **Dynamic Status Display**: "online" status shows as "Present" to indicate event attendance
  - **Conditional Actions**: Edit/delete actions disabled for event registrations, only available for regular members
- **✅ AUXILIARY BODY SYSTEM COMPLETELY DYNAMIC**: 
  - **Removed All Hardcoded Data**: Eliminated all hardcoded "Atfal", "Khuddam", "Lajna", "Ansarullah", "Nasra" references
  - **Event-Based Eligibility**: Auxiliary bodies now dynamically extracted from event eligibility criteria
  - **Custom Form Integration**: Additional auxiliary bodies from custom form field options (radio, select, checkbox)
  - **Member Data Integration**: Existing member auxiliary body values contribute to the dynamic list
  - **Zero Fallbacks**: System works with empty auxiliary body lists, no hardcoded fallbacks
- **Replit Migration**: Successfully migrated project from Replit Agent to Replit environment with proper security practices
- **Payment System Fixes**: 
  - Resolved "registrationData path" error by adding support for existing registration payments
  - Fixed "invalid split configuration" error by correcting Paystack parameter ordering
  - Fixed payment verification logic to update existing registrations instead of creating duplicates
  - Added missing `deleteEventRegistration` method to MongoDB storage interface
  - Configured Paystack API keys for production payment processing
  - Enhanced payment verification logging for better debugging
  - Fixed NotificationService.sendNotification error by correcting method call
- **PDF Generation & Registration Cards Enhancement**:
  - Fixed PDF download to display proper event details (name, location, date, time)
  - Updated registration card to show complete participant information including email
  - Implemented shorter manual verification codes (6-digit numbers) for easier verification
  - Enhanced event data passing through URL parameters during payment verification redirect
  - Fixed QR code display in both PDF and web registration cards
  - Improved fallback data handling using URL search parameters when direct data is unavailable
- **MongoDB Storage Interface**: 
  - Added `getEventsByOrganization` method for organization-specific event retrieval
  - Implemented `getPaymentHistory` method with aggregation pipeline for payment tracking
  - Enhanced storage interface to support payment history functionality
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