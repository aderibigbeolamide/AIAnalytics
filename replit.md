# Eventify AI - AI-Powered Member Validation System

## Overview
Eventify AI is an AI-powered, multi-tenant member validation system designed to streamline event operations and member engagement for various organizations. It offers comprehensive event management, member validation, QR code scanning, a robust ticket system, payment processing, and real-time notifications. The platform supports a dual-admin architecture, enabling super admin oversight and organization-specific administration. Its vision is to provide a seamless and efficient solution for managing events and member interactions, targeting a broad market of organizations needing advanced validation and event management capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: User-friendly design with professional appearance, no demo credentials on login page, direct users to contact admin for login issues.
Code structure: Well-organized, developer-friendly structure with clear separation of concerns, responsive design for mobile and desktop, comprehensive documentation for easy onboarding.
Business focus: Strong emphasis on investor attraction through compelling pitch deck showcasing flexible pricing plans and commission-based revenue model (5% base rate with growth potential to 12%+).

## System Architecture
### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: Zustand for global state management
- **UI Framework**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with responsive design
- **Data Fetching**: TanStack Query for server state management
- **Build Tool**: Vite for fast development and production builds
- **Real-time Communication**: WebSocket for instant messaging

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: MongoDB with Mongoose ODM (MongoDB Atlas)
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Architecture**: RESTful API with organized route structure
- **Real-time Messaging**: WebSocket server with broadcasting capabilities
- **File Storage**: Local file system with Cloudinary integration
- **Payment Processing**: Paystack API with multi-tenant support

### Code Organization (Recent Update - Jan 2025)
- **Backend Structure**: Organized into `/routes`, `/services`, `/middleware`, and `/utils` directories
- **Frontend Structure**: Feature-based components in `/components/features`, shared utilities in `/lib`
- **API Client**: Centralized API client with consistent error handling and authentication
- **State Management**: Zustand stores with persistence and session management
- **Type Safety**: Shared TypeScript interfaces between frontend and backend
- **Public Pages**: Added comprehensive About page and Documentation system with user guidance
- **Enhanced Landing Page**: Updated with clear mission, vision, and objectives prominently displayed

### Core Architectural Decisions
- **Dual-Admin Architecture**: Features a super admin for system oversight and organization-specific admins for tenant management.
- **Multi-Tenant System**: Ensures complete organization isolation with dedicated dashboards and payment routing capabilities.
- **Comprehensive Event System**: Supports both traditional registration-based events with advanced validation (e.g., QR, manual) and simplified ticket-based events.
- **Robust Authentication**: Implements JWT-based, role-based access control with secure password hashing.
- **AI-Powered Features**: Includes AI-driven solutions such as a seat availability heatmap for real-time capacity visualization and an event recommendation engine for personalized suggestions.
- **Notification System**: Provides real-time in-app notifications with broadcasting and targeted messaging.
- **Real-time Chat System**: WhatsApp-like instant messaging between customers and admins with WebSocket technology, eliminating the need for page refreshes.
- **Event Reminder System**: Automated email and in-app reminders sent to event participants at configurable intervals.
- **Comprehensive Email Service**: Professional email automation for organization approvals, event reminders, payment confirmations, and registration confirmations with PDF tickets using Zoho SMTP integration.
- **QR Code Management**: Handles secure generation, encryption, and validation of QR codes for event access.
- **PDF Ticket Generation**: Automated creation of professional event tickets with QR codes, branding, and security features.
- **UI/UX Design**: Prioritizes a clean, professional, and accessible user interface with responsive design principles.
- **Payment System**: Integrates with Paystack to support flexible payment rules, direct organizer payments via subaccounts, and platform revenue sharing.
- **Bank Account Management**: Facilitates secure setup and verification of Nigerian bank accounts for organizations.
- **Platform Statistics & Analytics**: Implemented comprehensive super admin dashboard with platform settings, financial metrics, growth analytics, and KPI tracking with chart visualizations. Includes organization-specific analytics.
- **Comprehensive Documentation System**: Multi-tabbed documentation covering Getting Started, Features, Pricing, API, Support, and FAQ sections to guide users through the platform.
- **About Page**: Professional company overview showcasing mission, vision, goals, achievements, technology stack, and value propositions with investor-focused content.
- **Enhanced Event Feedback System (January 2025)**: Improved accessibility of the existing reporting system by adding "Provide Feedback" navigation links to all public event detail pages and ticket purchase flows, enabling users to easily submit feedback, complaints, suggestions, and reports for both registration-based and ticket-based events.

## External Dependencies
- **Database**:
    - `mongodb`
    - `mongoose`
- **API/Payment**:
    - `paystack`
    - `OpenAI API`
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
    - `Cloudinary`
    - `jspdf`
    - `html2canvas`