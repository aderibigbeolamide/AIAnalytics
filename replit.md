# EventValidate - AI-Powered Member Validation System

## Overview
EventValidate is an AI-powered, multi-tenant member validation system designed to streamline event operations and member engagement for various organizations. It offers comprehensive event management, member validation, QR code scanning, a robust ticket system, payment processing, and real-time notifications. The platform supports a dual-admin architecture, enabling super admin oversight and organization-specific administration. Its vision is to provide a seamless and efficient solution for managing events and member interactions, targeting a broad market of organizations needing advanced validation and event management capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: User-friendly design with professional appearance, no demo credentials on login page, direct users to contact admin for login issues.

## Recent Changes (August 2025)
- Successfully migrated from Replit Agent to standard Replit environment
- Fixed landing page event card navigation issue: corrected `/event/${id}` to `/event-view/${id}` route
- All workflows and dependencies confirmed working properly
- MongoDB connection and auto-seeding functioning correctly
- **Fixed Super Admin Event Oversight**: Resolved ObjectId casting errors and corrected function parameter calls for event registration counting
- **Enhanced Event Statistics Display**: Updated event cards to show meaningful statistics for ticket-based events (Paid/Pending/Failed instead of Members/Guests/Invitees)
- **Improved Ticket-Based Event Details**: Added comprehensive ticket purchaser view showing payment status, categories, and breakdown for ticket-based events
- **Fixed Event Details API**: Updated backend to properly calculate and display ticket sales statistics on event cards
- **Fixed Ticket System Issues**: Resolved QR code generation for manual payments, PDF download functionality, and payment initialization from ticket lookup
- **Added Manual Payment Verification**: Created endpoint for admin verification of manual ticket payments with automatic QR code generation
- **Fixed Payment Display Issues**: Resolved frontend/backend authorization URL mismatch, QR code display issues, and PDF generation problems
- **Confirmed Admin Payment Tracking**: Verified that admin dashboard properly tracks all user payments through event tickets and registration systems

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