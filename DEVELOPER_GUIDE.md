# EventValidate Developer Guide

## Project Structure & Developer Guidelines

### 📁 Project Architecture

```
EventValidate/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Base UI components (shadcn/ui)
│   │   │   ├── forms/         # Form components
│   │   │   ├── layout/        # Layout components
│   │   │   └── features/      # Feature-specific components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and configurations
│   │   └── stores/            # Zustand state management
├── server/                     # Backend Node.js/Express
│   ├── models/                # Database models (MongoDB/Mongoose)
│   ├── routes/                # API route handlers
│   ├── middleware/            # Express middleware
│   ├── utils/                 # Server utilities
│   └── services/              # Business logic services
├── shared/                     # Shared code between client/server
│   └── schema.ts              # Shared type definitions
└── config/                     # Configuration files
```

### 🛠️ Development Workflow

#### 1. Setting Up Development Environment
```bash
npm install                    # Install dependencies
npm run dev                   # Start development server
```

#### 2. Code Organization Principles

**Components Structure:**
- **Base Components** (`client/src/components/ui/`): Reusable UI primitives
- **Feature Components** (`client/src/components/features/`): Business logic components
- **Page Components** (`client/src/pages/`): Top-level page containers
- **Layout Components** (`client/src/components/layout/`): Navigation, headers, footers

**Naming Conventions:**
- Components: PascalCase (`UserDashboard.tsx`)
- Files: kebab-case (`user-dashboard.tsx`)
- Variables/Functions: camelCase (`getUserData`)
- Constants: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

**Import Organization:**
```typescript
// 1. External libraries
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Internal components
import { UserCard } from '@/components/features/user-card';

// 3. Utilities and types
import { cn } from '@/lib/utils';
import type { User } from '@/types';
```

#### 3. State Management Guidelines

**Zustand Stores** (`client/src/stores/`):
- `auth-store.ts`: Authentication state
- `chat-store.ts`: Real-time chat state
- `ui-store.ts`: UI state (modals, notifications)

**API State Management:**
- Use TanStack Query for server state
- Use optimistic updates for better UX
- Implement proper error boundaries

#### 4. Styling Guidelines

**Responsive Design:**
- Mobile-first approach
- Use Tailwind CSS breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Consistent spacing: Use Tailwind spacing scale

**Dark Mode Support:**
- Use `dark:` variants for all styling
- Define CSS variables in `index.css`
- Test both light and dark themes

#### 5. API Development

**Route Organization:**
- Group related routes in separate files
- Use consistent error handling
- Implement proper validation with Zod
- Add TypeScript types for all endpoints

**Example Route Structure:**
```typescript
// server/routes/user-routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/users/:id', authenticateToken, async (req, res) => {
  // Implementation
});

export default router;
```

### 📱 Mobile & Desktop Optimization

#### Mobile-First Responsive Design
- Touch-friendly interface (minimum 44px touch targets)
- Optimized navigation for mobile
- Responsive typography and spacing
- Fast loading with minimal JavaScript bundles

#### Desktop Enhancements
- Keyboard navigation support
- Hover states and transitions
- Multi-column layouts where appropriate
- Efficient use of screen real estate

### 🎨 User Experience Guidelines

#### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Color contrast compliance
- Screen reader compatibility

#### Performance
- Code splitting and lazy loading
- Image optimization
- Efficient state updates
- Minimal re-renders

#### Error Handling
- User-friendly error messages
- Graceful degradation
- Loading states
- Retry mechanisms

### 🔧 Development Tools

#### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Importer
- Auto Rename Tag
- Prettier - Code formatter

#### Code Quality
- ESLint configuration for consistent code style
- Prettier for automatic formatting
- TypeScript for type safety
- Husky for pre-commit hooks

### 📊 Monitoring & Debugging

#### Development Debugging
- React Developer Tools
- Console logging best practices
- Error boundaries for crash protection
- Network request monitoring

#### Production Monitoring
- Error tracking and reporting
- Performance monitoring
- User analytics
- API response time tracking

### 🚀 Deployment Guidelines

#### Environment Configuration
- Separate configs for development/production
- Environment variable management
- Secure secret handling
- Database migration strategies

#### Build Optimization
- Bundle size analysis
- Tree shaking for unused code
- Asset optimization
- CDN configuration

### 📚 Additional Resources

- [React Best Practices](https://react.dev/learn)
- [TypeScript Guidelines](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs)

### 🤝 Contributing Guidelines

1. **Before Starting**: Check existing issues and discuss major changes
2. **Code Style**: Follow established patterns and conventions
3. **Testing**: Write tests for new features and bug fixes
4. **Documentation**: Update relevant documentation
5. **Pull Requests**: Provide clear descriptions and test instructions

### 🐛 Common Issues & Solutions

#### Development Server Issues
- Clear node_modules and reinstall dependencies
- Check port conflicts (default: 5000)
- Verify environment variables

#### Build Issues
- Check TypeScript errors
- Verify import paths
- Ensure all dependencies are installed

#### Runtime Issues
- Check browser console for errors
- Verify API endpoint connectivity
- Check authentication state