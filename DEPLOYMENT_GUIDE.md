# EventValidate Deployment Guide

EventValidate is designed for automatic deployment across multiple platforms with zero configuration changes needed between environments.

## Automatic Environment Detection

The application automatically detects and configures itself for:
- **Replit**: Uses Replit environment variables and port 5000
- **Local Development**: Uses `.env` file and port 3000
- **Production Platforms**: Adapts to platform-specific environment variables

## Platform Deployment Options

### 1. Render (Recommended)

**Build Command**: `npm install && node scripts/deploy-build.js`

**Start Command**: `npm start`

**Environment Variables**:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key
NODE_ENV=production
APP_DOMAIN=https://your-app.onrender.com
```

**Deployment Steps**:
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build and start commands above
4. Add environment variables
5. Deploy automatically on each push

### 2. Railway

**Automatic Detection**: Railway auto-detects Node.js projects

**Environment Variables** (same as above):
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key
NODE_ENV=production
APP_DOMAIN=https://your-app.up.railway.app
```

**Deployment Steps**:
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway automatically builds and deploys

### 3. Vercel

**Build Command**: `node scripts/deploy-build.js`

**Output Directory**: `dist`

**Install Command**: `npm install`

**Environment Variables** (same as above)

### 4. Heroku

**Buildpack**: `heroku/nodejs`

**Environment Variables** (same as above)

**Deployment Steps**:
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set JWT_SECRET=your-secret
heroku config:set ENCRYPTION_KEY=your-key
heroku config:set NODE_ENV=production
git push heroku main
```

### 5. Digital Ocean App Platform

**Build Command**: `node scripts/deploy-build.js`

**Run Command**: `npm start`

**Environment Variables** (same as above)

### 6. Netlify (with Functions)

For Netlify, you'll need to configure serverless functions. The current setup works better with the above platforms.

## Required Environment Variables

### Essential (Required for all deployments)
```bash
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-very-secure-jwt-secret-key-minimum-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key-here-exactly
NODE_ENV=production
APP_DOMAIN=https://your-deployed-domain.com
```

### Optional (Enhance functionality)
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# Payment Processing
PAYSTACK_SECRET_KEY=sk_live_your_live_key
PAYSTACK_PUBLIC_KEY=pk_live_your_live_key

# Analytics
GTM_ID=GTM-XXXXXXXX

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Security (Optional overrides)
BCRYPT_ROUNDS=12
JWT_EXPIRY=7d
```

## Database Setup

### PostgreSQL Options

1. **Platform-provided**:
   - Render PostgreSQL
   - Railway PostgreSQL 
   - Heroku Postgres

2. **External providers**:
   - Neon (Recommended - Serverless PostgreSQL)
   - Supabase
   - AWS RDS
   - Google Cloud SQL

### Database Initialization

After deployment, run these commands once:

```bash
# Push database schema
npm run db:push

# Create admin user  
npm run seed
```

For platforms with CLI access, use their command tools. For others, you may need to run these locally pointing to your production database.

## Build Process

The application uses a unified build process that works across all platforms:

1. **Frontend Build**: `vite build` creates optimized client bundle
2. **Backend Preparation**: Files are copied to `server/public/`
3. **Production Server**: Express serves both API and static files

## Security Considerations

### Production Checklist

- [ ] Use strong, unique JWT_SECRET (minimum 32 characters)
- [ ] Use secure ENCRYPTION_KEY (exactly 32 characters)
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS (APP_DOMAIN with https://)
- [ ] Configure secure database connection (SSL enabled)
- [ ] Change default admin password after first login
- [ ] Review and set appropriate CORS origins if needed
- [ ] Enable database backups
- [ ] Set up monitoring and logging

### Environment Variable Generation

Generate secure secrets:

```bash
# Generate JWT Secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Post-Deployment Setup

### 1. Verify Deployment
- Visit your deployed URL
- Check that login page loads
- Test admin login (admin/password123)

### 2. Configure Admin Account
- Login with default credentials
- Change admin password immediately
- Update admin profile information

### 3. Test Core Features
- Create a test event
- Test registration flow
- Verify QR code generation
- Test event validation

### 4. Configure Integrations
- Set up email SMTP if needed
- Configure Paystack for payments
- Test any external integrations

## Monitoring & Maintenance

### Health Checks
Most platforms provide automatic health checks. The application responds to:
- `GET /` - Frontend health
- `GET /api/health` - Backend health (if implemented)

### Logging
The application logs to console, which most platforms automatically capture.

### Updates
1. Push changes to your repository
2. Platform automatically rebuilds and deploys
3. Database migrations run automatically via `npm run db:push`

## Troubleshooting

### Common Issues

**Build Failures**:
- Ensure all dependencies are in `package.json`
- Check build command includes file copying
- Verify Node.js version compatibility

**Database Connection**:
- Verify DATABASE_URL format
- Check SSL requirements for your database
- Ensure database allows connections from deployment platform

**Static Files Not Loading**:
- Verify build command copies files to `server/public/`
- Check that Express is serving static files correctly

**Environment Variables**:
- All platforms handle environment variables differently
- Verify variables are set correctly in platform dashboard
- Check for typos in variable names

## Platform-Specific Notes

### Render
- Automatic SSL certificates
- Built-in PostgreSQL integration
- Zero-downtime deployments

### Railway
- Excellent for PostgreSQL integration
- Automatic domain generation
- Simple environment variable management

### Vercel
- Optimized for static sites and serverless
- May require serverless function configuration
- Consider other platforms for full-stack apps

### Heroku
- Mature platform with extensive documentation
- Built-in PostgreSQL addon
- Requires Procfile for custom configurations

The application is designed to "just work" across all these platforms with minimal configuration. The automatic environment detection handles the differences between platforms seamlessly.