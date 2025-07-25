# EventValidate Deployment Guide

This guide covers deployment across three environments: Replit, Local Development, and Production.

## Environment Configuration

The application uses a centralized environment configuration system (`config/environment.ts`) that automatically detects and configures the runtime environment.

### Environment Variables

Create these environment variables based on your deployment target:

#### Required Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Security
JWT_SECRET=your-secure-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Application
NODE_ENV=development|production
PORT=5000
APP_DOMAIN=http://localhost:5000|https://your-domain.com
```

#### Optional Variables
```bash
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# Payment
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key

# Analytics
GTM_ID=GTM-XXXXXXXX

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

## 1. Replit Environment (Current)

✅ **Already configured and running**

The application automatically detects Replit environment and:
- Uses port 5000 (required by Replit)
- Serves static files from `server/public`
- Uses Replit's environment variables
- Handles database connections properly

**Default credentials:**
- Username: `admin`
- Password: `password123`

## 2. Local Development Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running locally
- Git for version control

### Setup Steps

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd eventvalidate
   npm install
   ```

2. **Create Environment File**
   ```bash
   # Create .env file in project root
   cp .env.example .env
   
   # Edit .env with your local configuration
   DATABASE_URL=postgresql://localhost:5432/eventvalidate
   JWT_SECRET=your-local-jwt-secret
   ENCRYPTION_KEY=your-32-character-local-key-1234
   NODE_ENV=development
   PORT=3000
   APP_DOMAIN=http://localhost:3000
   ```

3. **Setup Local Database**
   ```bash
   # Create PostgreSQL database
   createdb eventvalidate
   
   # Push database schema
   npm run db:push
   
   # Seed with admin user
   npm run seed
   ```

4. **Build and Start**
   ```bash
   # Build client application
   npm run build:client
   
   # Copy static files (required for proper serving)
   mkdir -p server/public
   cp -r dist/public/* server/public/
   
   # Start development server
   npm run dev
   ```

5. **Access Application**
   - Open http://localhost:3000 (or your configured PORT)
   - Login with admin/password123

## 3. Production Deployment

### Supported Platforms
- **Render** (Recommended)
- **Railway**
- **Heroku** 
- **VPS/Self-hosted**

### Pre-deployment Checklist
- [ ] Production database configured
- [ ] Environment variables set securely
- [ ] Domain/subdomain configured
- [ ] SSL certificate (handled by platform)
- [ ] Email service configured (optional)
- [ ] Payment service configured (optional)

### Platform-Specific Instructions

#### Render Deployment
```bash
# Build Command:
npm install && npm run build:client && mkdir -p server/public && cp -r dist/public/* server/public/

# Start Command:
npm start

# Environment Variables:
NODE_ENV=production
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/eventvalidate_prod
JWT_SECRET=super-secure-production-jwt-secret
APP_DOMAIN=https://your-app.onrender.com
```

#### Railway Deployment
```bash
# Railway auto-detects Node.js
# Set environment variables in Railway dashboard
# Use Railway PostgreSQL addon for database

# Required Environment Variables:
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret
ENCRYPTION_KEY=your-production-encryption-key
APP_DOMAIN=https://your-app.up.railway.app
```

#### Heroku Deployment
```bash
# Add Node.js buildpack
heroku buildpacks:add heroku/nodejs

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-jwt-secret
heroku config:set APP_DOMAIN=https://your-app.herokuapp.com

# Deploy
git push heroku main
```

#### VPS/Self-hosted
```bash
# On your server
git clone <your-repo-url>
cd eventvalidate
npm install

# Set environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@localhost:5432/eventvalidate
export JWT_SECRET=your-production-jwt-secret
export APP_DOMAIN=https://your-domain.com

# Build application
npm run build:client
mkdir -p server/public
cp -r dist/public/* server/public/
npm run build:server

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start dist/index.js --name eventvalidate

# Setup auto-restart
pm2 startup
pm2 save
```

### Post-Deployment Steps

1. **Database Setup**
   ```bash
   # Push schema to production database
   npm run db:push
   
   # Create admin user
   npm run seed
   ```

2. **Verify Deployment**
   - [ ] Application loads successfully
   - [ ] Admin login works (admin/password123)
   - [ ] Dashboard displays properly
   - [ ] Database connections work
   - [ ] File uploads work
   - [ ] Email notifications work (if configured)
   - [ ] Payment processing works (if configured)

3. **Security Checklist**
   - [ ] Change default admin password
   - [ ] Use secure JWT_SECRET in production
   - [ ] Use secure ENCRYPTION_KEY in production
   - [ ] Enable HTTPS (handled by platform)
   - [ ] Configure CORS if needed
   - [ ] Set up monitoring and logging

## Environment Detection

The application automatically detects the runtime environment:

- **Replit**: Detected by `REPL_ID` environment variable
- **Production**: Detected by `NODE_ENV=production`
- **Development**: Default when neither above conditions are met

## Build Process

The application uses different build strategies:

1. **Development**: No build required, uses tsx for TypeScript execution
2. **Replit**: Client build only, static files copied to `server/public`
3. **Production**: Full build (client + server), optimized bundles

## Troubleshooting

### Common Issues

1. **"Could not find build directory"**
   ```bash
   # Solution: Build client and copy files
   npm run build:client
   mkdir -p server/public
   cp -r dist/public/* server/public/
   ```

2. **Database connection errors**
   ```bash
   # Check DATABASE_URL format
   postgresql://username:password@host:port/database
   
   # Verify database exists and is accessible
   ```

3. **Port binding issues**
   ```bash
   # Replit: Must use port 5000
   # Local: Can use any port (set in .env)
   # Production: Use platform-assigned PORT
   ```

4. **Static files not loading**
   ```bash
   # Ensure files are in server/public
   ls -la server/public/
   
   # Rebuild if necessary
   npm run build:client && cp -r dist/public/* server/public/
   ```

### Support

- Check console logs for detailed error messages
- Verify environment variables are set correctly
- Ensure database is accessible and properly configured
- Check file permissions for upload directory

## Environment Status

The application logs its configuration on startup:
```
🌍 Environment: production
🚀 Runtime: Replit
🗄️  Database: postgresql://***:***@host:5432/database
🌐 Domain: https://your-domain.com
📁 Upload directory: uploads
📧 Email: smtp.gmail.com:587
💳 Paystack: configured
📊 Analytics: GTM-XXXXXXXX
```

This confirms all services are properly configured.