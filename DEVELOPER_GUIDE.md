# Developer Guide - EventValidate

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account
- Paystack account (for payments)
- Optional: Cloudinary account (for file uploads)

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see ENV_SETUP.md)
4. Start development: `npm run dev`

## 📁 Project Structure

```
EventValidate/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Base UI components (shadcn/ui)
│   │   │   ├── features/     # Feature-specific components
│   │   │   └── layout/       # Layout components
│   │   ├── pages/            # Route components/pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and configurations
│   │   ├── stores/           # Zustand state management
│   │   └── styles/           # CSS and styling
├── server/                   # Backend Express.js application
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic services
│   ├── middleware/           # Express middleware
│   ├── utils/                # Server utilities
│   └── storage/              # Data access layer
├── shared/                   # Shared types and schemas
└── config/                   # Configuration files
```

## 🏗️ Architecture Overview

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: Zustand for global state
- **UI Framework**: Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query
- **Build Tool**: Vite

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt
- **Real-time**: WebSocket for chat functionality
- **File Storage**: Local + Cloudinary integration
- **Payment**: Paystack API integration

### Key Features
- **Multi-tenant Architecture**: Organization-specific dashboards
- **Dual Admin System**: Super admin + Organization admins
- **Event Management**: Registration-based and ticket-based events
- **QR Code System**: Generation, encryption, and validation
- **Real-time Chat**: WebSocket-based messaging
- **AI Integration**: OpenAI for chatbot and recommendations
- **Payment Processing**: Paystack with revenue splitting
- **File Management**: Cloudinary integration for uploads

## 🔄 Data Flow

### Authentication Flow
1. User logs in → JWT token generated
2. Token stored in localStorage and auth store
3. Protected routes check authentication status
4. API requests include Authorization header

### Event Registration Flow
1. User selects event → Validation checks
2. Form submission → Payment processing (if required)
3. Registration created → QR code generated
4. Email confirmation sent → Database updated

### Real-time Features
- WebSocket connection for live chat
- Real-time notifications via broadcasting
- Live event updates and status changes

## 🛠️ Development Guidelines

### Code Organization
- **Components**: Single responsibility, reusable
- **Pages**: Route-level components with minimal logic
- **Services**: Business logic separated from UI
- **Types**: Shared interfaces in `/shared` directory
- **Utils**: Pure functions, no side effects

### Naming Conventions
- **Files**: kebab-case (e.g., `event-registration.tsx`)
- **Components**: PascalCase (e.g., `EventForm`)
- **Functions**: camelCase (e.g., `validateUser`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

### API Design
- RESTful endpoints with clear resource naming
- Consistent response format with proper HTTP status codes
- Authentication middleware for protected routes
- Input validation using Zod schemas

### Database Design
- MongoDB collections with Mongoose schemas
- Soft deletion using `deletedAt` field
- Indexing for performance optimization
- Data validation at schema level

## 🧪 Testing Strategy

### Frontend Testing
- Component tests using React Testing Library
- Integration tests for user workflows
- E2E tests for critical paths

### Backend Testing
- Unit tests for business logic
- Integration tests for API endpoints
- Database tests with test fixtures

### Testing Commands
```bash
npm test              # Run all tests
npm run test:client   # Frontend tests only
npm run test:server   # Backend tests only
npm run test:e2e      # End-to-end tests
```

## 🚀 Deployment

### Environment Setup
- Development: Local MongoDB + Local file storage
- Staging: MongoDB Atlas + Cloudinary
- Production: MongoDB Atlas + Cloudinary + CDN

### Build Process
```bash
npm run build         # Build for production
npm start            # Start production server
```

### Performance Optimization
- Code splitting with dynamic imports
- Image optimization with Cloudinary
- Caching strategies for API responses
- MongoDB query optimization

## 🔧 Common Development Tasks

### Adding a New Feature
1. Define types in `/shared/mongoose-schema.ts`
2. Create database schema/model
3. Implement API endpoints in `/server`
4. Create frontend components in `/client/src/components`
5. Add routing in `/client/src/App.tsx`
6. Update documentation

### Adding a New API Endpoint
1. Define route in appropriate route file
2. Add authentication middleware if needed
3. Implement validation using Zod
4. Add business logic to service layer
5. Update frontend API calls
6. Add error handling

### Debugging Tips
- Use browser dev tools for frontend debugging
- Check server logs for backend issues
- Monitor MongoDB queries for performance
- Use WebSocket debugging for real-time features

## 📚 Key Dependencies

### Frontend
- `react` - UI library
- `wouter` - Routing
- `zustand` - State management
- `@tanstack/react-query` - Data fetching
- `@radix-ui/*` - UI components
- `tailwindcss` - Styling

### Backend
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - Authentication
- `bcrypt` - Password hashing
- `ws` - WebSocket support
- `multer` - File uploads

### Shared
- `zod` - Schema validation
- `typescript` - Type safety

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection**: Check MONGODB_URI environment variable
2. **Authentication**: Verify JWT_SECRET is set
3. **File Uploads**: Ensure UPLOAD_DIR exists and has permissions
4. **WebSocket**: Check firewall settings for port 5000
5. **Payments**: Verify Paystack credentials

### Debug Commands
```bash
npm run check         # TypeScript type checking
npm run db:push       # Push database schema changes
npm run seed          # Seed database with test data
```

## 📖 Additional Resources
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Paystack API](https://paystack.com/docs)
- [OpenAI API](https://platform.openai.com/docs)