# Local Development Setup

This guide will help you set up EventValidate on your local machine.

## Quick Setup

Run the automated setup script:

```bash
node scripts/setup-local.js
```

This script will:
1. Clean any existing build artifacts
2. Build the client application
3. Copy static files to the expected location
4. Provide next steps for database setup

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Client Application
```bash
# Build the frontend
npm run build

# OR specifically build just the client
vite build

# Create server public directory and copy files
mkdir -p server/public
cp -r dist/public/* server/public/
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/eventvalidate

# Security Settings
JWT_SECRET=your-secure-jwt-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Application Settings
NODE_ENV=development
PORT=3000
APP_DOMAIN=http://localhost:3000

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# Optional: Payment Integration
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key

# Optional: Analytics
GTM_ID=GTM-XXXXXXXX

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

### 4. Database Setup

```bash
# Push database schema
npm run db:push

# Create admin user
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or your configured PORT).

## Default Admin Credentials

- **Username**: admin
- **Password**: password123

## Project Structure

```
EventValidate/
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   └── index.html
├── server/                 # Express backend
│   ├── public/            # Built frontend files (created during build)
│   ├── index.ts
│   ├── routes.ts
│   └── ...
├── shared/                # Shared types and schemas
│   └── schema.ts
├── config/                # Environment configuration
│   └── environment.ts
├── scripts/               # Build and setup scripts
│   └── setup-local.js
└── dist/                  # Build output (created during build)
    └── public/
```

## Common Issues

### "Could not find build directory" Error

This happens when the client hasn't been built yet. Run:

```bash
node scripts/setup-local.js
```

Or manually:

```bash
npm run build
mkdir -p server/public
cp -r dist/public/* server/public/
```

### Database Connection Issues

1. Make sure PostgreSQL is running locally
2. Create the database: `createdb eventvalidate`
3. Check your DATABASE_URL in `.env`
4. Run: `npm run db:push`

### Port Already in Use

If port 3000 is busy, change the PORT in your `.env` file:

```bash
PORT=3001
APP_DOMAIN=http://localhost:3001
```

### Environment Variables Not Loading

Make sure your `.env` file is in the project root directory and contains all required variables. The application will show warnings for missing variables.

## Development Workflow

1. **Make changes** to client code in `client/src/`
2. **Rebuild client** when needed: `npm run build` (or use the automated script)
3. **Copy files**: The setup script handles this automatically
4. **Restart server**: `npm run dev` will restart automatically

## Deployment

For deployment, the application automatically adapts to your deployment environment. See `DEPLOYMENT_GUIDE.md` for platform-specific instructions.

## Environment Detection

The application automatically detects:
- **Local Development**: Uses your `.env` file
- **Replit**: Uses Replit environment variables
- **Production**: Uses platform environment variables

No code changes needed between environments!