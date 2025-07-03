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

## Changelog
- June 30, 2025. Initial setup
- July 2, 2025. Complete QR validation workflow implemented
- July 3, 2025. Added event soft-delete functionality and invitation post assignments

## User Preferences

Preferred communication style: Simple, everyday language.