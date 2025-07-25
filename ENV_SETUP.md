# Environment Setup Guide

The application now automatically detects and loads your existing .env files using dotenv.

## How It Works

The application will automatically:
1. Look for `.env` file in the project root
2. Look for environment-specific files like `.env.development`, `.env.production`
3. Load environment variables from these files if they exist
4. Fall back to system environment variables if no .env files are found

## Environment Files Priority

1. **System environment variables** (highest priority)
2. **`.env.${NODE_ENV}`** (e.g., `.env.production`, `.env.development`)  
3. **`.env`** (base environment file)
4. **Fallback values** (development only)

## Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Security
JWT_SECRET=your-secure-jwt-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Application
NODE_ENV=development
PORT=5000
APP_DOMAIN=http://localhost:5000

# Optional variables
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password

PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key

GTM_ID=GTM-XXXXXXXX
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

## Environment-Specific Files

You can also create environment-specific files:

- **`.env.development`** - For local development
- **`.env.production`** - For production deployment
- **`.env.staging`** - For staging environment

## Current Status

✅ **Replit Environment**: Working with fallback values
✅ **Dotenv Integration**: Automatically detects and loads .env files
✅ **Multi-Environment Support**: Supports development, production, and Replit
✅ **Validation**: Warns about missing variables, errors in production

## For Your Local Machine

Simply create a `.env` file in the project root with your local configuration:

```bash
DATABASE_URL=postgresql://localhost:5432/eventvalidate
JWT_SECRET=your-local-jwt-secret
ENCRYPTION_KEY=your-local-encryption-key
NODE_ENV=development
PORT=3000
APP_DOMAIN=http://localhost:3000
```

## For Deployment

The application will automatically use your deployment platform's environment variables or your `.env.production` file.

## Validation

The application validates environment variables on startup:
- **Development**: Shows warnings for missing variables, uses fallbacks
- **Production**: Shows errors for missing/insecure variables, stops if critical errors found

No code changes needed - just add your .env files and the application will detect them automatically!