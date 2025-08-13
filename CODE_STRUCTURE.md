# Code Structure Guide

## 📂 Directory Structure

### `/client` - Frontend Application

#### `/client/src/components`
**Purpose**: Reusable UI components organized by functionality

```
components/
├── ui/                     # Base UI components (shadcn/ui)
│   ├── button.tsx         # Button component
│   ├── form.tsx           # Form components
│   ├── input.tsx          # Input components
│   └── ...
├── features/              # Feature-specific components
│   ├── auth/              # Authentication components
│   ├── events/            # Event-related components
│   ├── chat/              # Chat components
│   └── payments/          # Payment components
├── layout/                # Layout components
│   ├── navbar.tsx         # Navigation bar
│   ├── sidebar.tsx        # Sidebar navigation
│   └── footer.tsx         # Footer component
└── shared/                # Shared utility components
    ├── loading-spinner.tsx
    ├── error-boundary.tsx
    └── modal.tsx
```

#### `/client/src/pages`
**Purpose**: Route-level components representing different pages

```
pages/
├── auth/                  # Authentication pages
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── dashboard/             # Dashboard pages
│   ├── dashboard.tsx
│   ├── analytics.tsx
│   └── settings.tsx
├── events/                # Event-related pages
│   ├── events.tsx
│   ├── event-detail.tsx
│   ├── event-registration.tsx
│   └── create-event.tsx
├── admin/                 # Admin pages
│   ├── super-admin-dashboard.tsx
│   ├── organization-management.tsx
│   └── platform-analytics.tsx
└── public/                # Public pages
    ├── landing.tsx
    ├── about.tsx
    └── contact.tsx
```

#### `/client/src/hooks`
**Purpose**: Custom React hooks for reusable logic

```
hooks/
├── use-auth.ts           # Authentication hooks
├── use-events.ts         # Event-related hooks
├── use-api.ts            # API interaction hooks
├── use-websocket.ts      # WebSocket hooks
└── use-responsive.ts     # Responsive design hooks
```

#### `/client/src/lib`
**Purpose**: Utilities, configurations, and helper functions

```
lib/
├── api/                  # API client configuration
│   ├── client.ts         # Base API client
│   ├── endpoints.ts      # API endpoints
│   └── types.ts          # API response types
├── auth/                 # Authentication utilities
│   ├── auth-store.ts     # Auth state management
│   ├── jwt-utils.ts      # JWT token utilities
│   └── permissions.ts    # Permission checking
├── utils/                # General utilities
│   ├── date-utils.ts     # Date formatting
│   ├── validation.ts     # Form validation
│   └── formatters.ts     # Data formatters
└── constants/            # Application constants
    ├── routes.ts         # Route constants
    ├── api-endpoints.ts  # API endpoint constants
    └── app-config.ts     # App configuration
```

### `/server` - Backend Application

#### `/server/routes`
**Purpose**: API route handlers organized by domain

```
routes/
├── auth/                 # Authentication routes
│   ├── auth-routes.ts    # Login, register, logout
│   ├── password-reset.ts # Password reset functionality
│   └── session-management.ts
├── events/               # Event management routes
│   ├── event-routes.ts   # CRUD operations
│   ├── registration-routes.ts
│   └── validation-routes.ts
├── admin/                # Admin-specific routes
│   ├── super-admin-routes.ts
│   ├── organization-routes.ts
│   └── analytics-routes.ts
├── payments/             # Payment processing routes
│   ├── paystack-routes.ts
│   ├── transaction-routes.ts
│   └── webhook-routes.ts
└── chat/                 # Chat and messaging routes
    ├── chat-routes.ts
    ├── websocket-handler.ts
    └── notification-routes.ts
```

#### `/server/services`
**Purpose**: Business logic and external service integrations

```
services/
├── auth/                 # Authentication services
│   ├── AuthService.ts    # User authentication
│   ├── TokenService.ts   # JWT token management
│   └── PermissionService.ts
├── events/               # Event-related services
│   ├── EventService.ts   # Event management
│   ├── RegistrationService.ts
│   └── ValidationService.ts
├── payments/             # Payment services
│   ├── PaystackService.ts
│   ├── PaymentProcessor.ts
│   └── InvoiceService.ts
├── external/             # External API integrations
│   ├── OpenAIService.ts  # AI chatbot integration
│   ├── EmailService.ts   # Email notifications
│   └── SmsService.ts     # SMS notifications
└── storage/              # File storage services
    ├── CloudinaryService.ts
    ├── LocalStorage.ts
    └── FileHandler.ts
```

#### `/server/middleware`
**Purpose**: Express middleware functions

```
middleware/
├── auth/                 # Authentication middleware
│   ├── jwt-middleware.ts # JWT verification
│   ├── role-middleware.ts # Role-based access
│   └── organization-middleware.ts
├── validation/           # Request validation
│   ├── schema-validator.ts
│   ├── file-validator.ts
│   └── sanitizer.ts
├── security/             # Security middleware
│   ├── rate-limiter.ts   # Rate limiting
│   ├── cors-handler.ts   # CORS configuration
│   └── helmet-config.ts  # Security headers
└── logging/              # Logging middleware
    ├── request-logger.ts
    ├── error-logger.ts
    └── audit-logger.ts
```

#### `/server/models`
**Purpose**: Database models and schemas

```
models/
├── User.ts              # User model
├── Organization.ts      # Organization model
├── Event.ts             # Event model
├── Registration.ts      # Registration model
├── Payment.ts           # Payment model
├── Notification.ts      # Notification model
└── ChatSession.ts       # Chat session model
```

### `/shared` - Shared Types and Schemas

```
shared/
├── types/               # TypeScript interfaces
│   ├── auth.ts          # Authentication types
│   ├── events.ts        # Event-related types
│   ├── payments.ts      # Payment types
│   └── api.ts           # API response types
├── schemas/             # Validation schemas
│   ├── mongoose-schema.ts # MongoDB schemas
│   ├── zod-schemas.ts   # Zod validation schemas
│   └── api-schemas.ts   # API request/response schemas
└── constants/           # Shared constants
    ├── status-codes.ts  # HTTP status codes
    ├── error-messages.ts # Error message constants
    └── app-constants.ts # Application constants
```

## 🔄 Data Flow Architecture

### Request Flow
```
Client Request → Router → Middleware → Controller → Service → Model → Database
                                   ↓
Client Response ← JSON ← Response ← Business Logic ← Data Access ← Query Result
```

### Authentication Flow
```
Login Request → Auth Controller → Auth Service → User Model → JWT Token
                                                            ↓
Protected Route → JWT Middleware → Token Validation → User Context
```

### WebSocket Flow
```
Client Connection → WebSocket Handler → Session Manager → Message Router → Database
                                                                        ↓
Broadcast Message ← WebSocket Server ← Event Handler ← Business Logic ← Data Update
```

## 🎯 Component Guidelines

### React Component Structure
```typescript
// ComponentName.tsx
import React from 'react';
import { ComponentProps } from './types';
import { useHook } from '../hooks/useHook';
import './ComponentName.css';

interface Props {
  // Props interface
}

export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks
  const { data, loading } = useHook();
  
  // Event handlers
  const handleEvent = () => {
    // Handle logic
  };
  
  // Render logic
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="component-container">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### API Route Structure
```typescript
// route-handler.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateSchema } from '../middleware/validation';
import { Service } from '../services/Service';
import { schema } from '../schemas/schema';

const router = Router();

// GET endpoint
router.get('/endpoint', authMiddleware, async (req, res, next) => {
  try {
    const result = await Service.getData(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST endpoint with validation
router.post('/endpoint', 
  authMiddleware, 
  validateSchema(schema), 
  async (req, res, next) => {
    try {
      const result = await Service.createData(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

## 📝 File Naming Conventions

### Frontend Files
- Components: `PascalCase.tsx` (e.g., `EventForm.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-event-data.ts`)
- Utilities: `kebab-case.ts` (e.g., `date-utils.ts`)
- Types: `kebab-case.types.ts` (e.g., `event.types.ts`)
- Tests: `Component.test.tsx` or `utils.test.ts`

### Backend Files
- Routes: `kebab-case-routes.ts` (e.g., `event-routes.ts`)
- Services: `PascalCaseService.ts` (e.g., `EventService.ts`)
- Models: `PascalCase.ts` (e.g., `Event.ts`)
- Middleware: `kebab-case.ts` (e.g., `auth-middleware.ts`)
- Utils: `kebab-case.ts` (e.g., `database-utils.ts`)

## 🏗️ Architectural Patterns

### Separation of Concerns
- **Presentation Layer**: React components (UI only)
- **Business Logic**: Services and hooks
- **Data Access**: Models and repositories
- **External Services**: Dedicated service classes

### Error Handling
- Frontend: Error boundaries and try-catch blocks
- Backend: Centralized error middleware
- Database: Validation at schema level
- API: Consistent error response format

### State Management
- Local state: React useState/useReducer
- Global state: Zustand stores
- Server state: TanStack Query
- Session state: localStorage with hydration

This structure ensures maintainable, scalable code that's easy to navigate and understand.