# Environment Setup Guide

EventValidate automatically detects and adapts to different environments. Here's how to set up environment variables for each deployment target.

## Environment Detection

The application automatically detects:
- **Replit Environment**: Uses `REPL_ID` presence
- **Local Development**: Uses `.env` file or defaults to localhost:3000
- **Production**: Adapts to platform environment variables

## Required Environment Variables

### Core Variables (Required for all environments)

```bash
# Database Connection
DATABASE_URL=postgresql://username:password@host:port/database

# Security Settings  
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
ENCRYPTION_KEY=your-exactly-32-character-encryption-key

# Application Environment
NODE_ENV=production  # or development
APP_DOMAIN=https://your-deployed-domain.com
```

### Optional Variables (Enhanced functionality)

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com  
SMTP_PASS=your-app-password

# Payment Processing (Paystack)
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key

# Analytics
GTM_ID=GTM-XXXXXXXX

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Security Overrides
BCRYPT_ROUNDS=12
JWT_EXPIRY=7d
```

## Platform-Specific Setup

### 1. Render

In your Render dashboard:
1. Go to your Web Service
2. Navigate to "Environment" tab
3. Add each variable as Key-Value pairs

**Example Configuration**:
```
DATABASE_URL=postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/dbname
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
ENCRYPTION_KEY=12345678901234567890123456789012
NODE_ENV=production
APP_DOMAIN=https://your-app.onrender.com
```

### 2. Railway

In your Railway project:
1. Go to Variables tab
2. Add environment variables

Railway automatically provides `DATABASE_URL` if you add PostgreSQL service.

### 3. Vercel

In your Vercel project dashboard:
1. Go to Settings → Environment Variables
2. Add each variable with appropriate environment (Production, Preview, Development)

### 4. Heroku

Using Heroku CLI:
```bash
# Set required variables
heroku config:set DATABASE_URL=postgresql://...
heroku config:set JWT_SECRET=your-secret
heroku config:set ENCRYPTION_KEY=your-key
heroku config:set NODE_ENV=production
heroku config:set APP_DOMAIN=https://your-app.herokuapp.com

# Set optional variables
heroku config:set PAYSTACK_SECRET_KEY=sk_live_...
heroku config:set SMTP_HOST=smtp.gmail.com
```

Or in Heroku Dashboard:
1. Go to Settings tab
2. Click "Reveal Config Vars"
3. Add each variable

### 5. Local Development

Create `.env` file in project root:

```bash
# Database (use local PostgreSQL or cloud database)
DATABASE_URL=postgresql://postgres:password@localhost:5432/eventvalidate

# Security (generate secure values)
JWT_SECRET=your-development-jwt-secret-here
ENCRYPTION_KEY=dev-key-32-characters-long-here

# Application
NODE_ENV=development
PORT=3000
APP_DOMAIN=http://localhost:3000

# Optional development settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-dev-email@gmail.com
SMTP_PASS=your-app-password

# Development Paystack (use test keys)
PAYSTACK_SECRET_KEY=sk_test_your_test_key
PAYSTACK_PUBLIC_KEY=pk_test_your_test_key
```

## Generating Secure Secrets

### JWT Secret (32+ characters)
```bash
# Generate with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate with OpenSSL
openssl rand -hex 32
```

### Encryption Key (exactly 32 characters)
```bash
# Generate with Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generate with OpenSSL  
openssl rand -hex 16
```

## Database Setup

### PostgreSQL Database Options

1. **Platform-provided databases**:
   - Render PostgreSQL (free tier available)
   - Railway PostgreSQL (usage-based pricing)
   - Heroku Postgres (free tier available)

2. **External database providers**:
   - **Neon** (Recommended - serverless PostgreSQL)
   - Supabase (PostgreSQL with additional features)
   - AWS RDS (scalable, managed PostgreSQL)
   - Google Cloud SQL
   - Azure Database for PostgreSQL

### Database Connection Format

```bash
# Standard PostgreSQL connection
DATABASE_URL=postgresql://username:password@host:port/database_name

# With SSL (recommended for production)
DATABASE_URL=postgresql://username:password@host:port/database_name?sslmode=require

# Neon (serverless PostgreSQL)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/database_name?sslmode=require
```

## Environment Validation

The application validates environment variables on startup and provides warnings for:
- Missing required variables
- Insecure fallback values in production
- Invalid format for certain variables

Check console output on startup for validation messages.

## Environment-Specific Configurations

### Development Environment
- Uses fallback values for missing variables
- Allows insecure secrets for testing
- Enables detailed logging
- Auto-detects `.env` files

### Production Environment
- Requires all security variables
- No fallback values for sensitive data
- Optimized logging
- Strict validation

### Replit Environment
- Uses Replit-provided environment variables
- Port automatically configured
- Database URL from Replit database service
- No `.env` files needed

## Troubleshooting

### Common Issues

**"Missing required environment variable"**
- Check variable name spelling
- Ensure variable is set in platform dashboard
- Verify deployment has access to variables

**"Database connection failed"**
- Verify DATABASE_URL format
- Check database server is running
- Ensure SSL settings match database requirements
- Test connection from your local machine

**"Invalid JWT Secret"**
- JWT_SECRET must be at least 32 characters
- Generate secure secret using provided commands
- Don't use default/example values in production

**"Encryption key invalid"**
- ENCRYPTION_KEY must be exactly 32 characters
- Generate using crypto.randomBytes(16).toString('hex')
- Ensure consistent across all instances

### Validation Commands

Test your environment variables locally:

```bash
# Test database connection
npm run db:push

# Test application startup
npm run dev

# Check environment configuration
node -e "console.log(process.env.DATABASE_URL ? 'DB: OK' : 'DB: Missing')"
node -e "console.log(process.env.JWT_SECRET?.length >= 32 ? 'JWT: OK' : 'JWT: Too short')"
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different secrets** for development and production
3. **Rotate secrets periodically** (especially JWT_SECRET)
4. **Use HTTPS** in production (APP_DOMAIN should be https://)
5. **Enable database SSL** in production
6. **Limit database access** to application servers only
7. **Use strong passwords** for database users
8. **Enable database backups** for production

## Multi-Environment Management

For teams managing multiple environments:

1. **Use environment-specific files**:
   - `.env.development`
   - `.env.staging` 
   - `.env.production`

2. **Document required variables** in team README
3. **Use secret management tools** for production
4. **Automate deployment** with CI/CD pipelines
5. **Test environment parity** across dev/staging/production

The application's automatic environment detection makes it easy to maintain consistent behavior across all deployment targets while adapting to each platform's specific requirements.