# Eventify AI - Local Development & Deployment Guide


## Local Development Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Git for version control

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <your-repo-url>
cd eventvalidate

# Install dependencies
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/eventvalidate

# JWT Security
JWT_SECRET=your-very-secure-jwt-secret-key-here

# Application Environment
NODE_ENV=development
PORT=5000

# Application Domain (for link generation)
APP_DOMAIN=http://localhost:5000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security Keys
ENCRYPTION_KEY=your-32-character-encryption-key-here

# File Upload - Cloudinary (Production)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# File Upload - Local Storage (Development)
UPLOAD_DIR=./uploads
```

### 3. Database Setup
```bash
# Initialize database schema
npm run db:push

# Create admin user
tsx scripts/seed.ts

# Optional: Open database studio
npm run db:studio
```

### 4. Start Development Server
```bash
# Start development server (frontend + backend)
npm run dev
```

Access the application at: `http://localhost:5000`

### 5. Default Admin Login
- **Username**: admin
- **Password**: password123

## Production Deployment

### Environment Variables for Production

Create a `.env` file with production values:

```bash
# Required
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/eventvalidate_prod
JWT_SECRET=super-secure-production-jwt-secret
NODE_ENV=production
PORT=5000

# Application Domain (IMPORTANT: Set your actual domain)
APP_DOMAIN=https://your-domain.com

# Email Configuration (Recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-app@domain.com
SMTP_PASS=app-password

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Deployment Options

#### 1. Render (Recommended)
```bash
# Build command: npm install && npm run build
# Start command: npm start
# Environment: Node.js 20

# Set environment variables in Render dashboard:
# - APP_DOMAIN=https://your-app-name.onrender.com
# - DATABASE_URL=your-postgres-connection-string
# - JWT_SECRET=your-jwt-secret
# - ENCRYPTION_KEY=your-encryption-key
```

#### 2. Railway
```bash
# Railway auto-detects Node.js projects
# Set environment variables in Railway dashboard:
# - APP_DOMAIN=https://your-app-name.railway.app
# - DATABASE_URL=your-postgres-connection-string
# - JWT_SECRET=your-jwt-secret
```

#### 3. Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - APP_DOMAIN=https://your-app-name.vercel.app
# - DATABASE_URL=your-postgres-connection-string
# - JWT_SECRET=your-jwt-secret
```

#### 4. VPS/Self-Hosted
```bash
# Build the application
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name eventvalidate

# Configure reverse proxy (nginx)
# Set APP_DOMAIN=https://your-domain.com
```

### Important: Domain Configuration

The `APP_DOMAIN` environment variable controls link generation:

**Local Development:**
```bash
APP_DOMAIN=http://localhost:5000
```

**Production Examples:**
```bash
# Render
APP_DOMAIN=https://your-app-name.onrender.com

# Railway
APP_DOMAIN=https://your-app-name.railway.app

# Vercel
APP_DOMAIN=https://your-app-name.vercel.app

# Custom Domain
APP_DOMAIN=https://your-domain.com
```

### Post-Deployment Steps

1. **Set Environment Variables**: Ensure all required environment variables are set in your deployment platform

2. **Database Migration**: Run database migrations if needed:
```bash
npm run db:push
```

3. **Create Admin User**: Create the initial admin user:
```bash
tsx scripts/seed.ts
```

4. **Test Core Features**:
   - Admin login and dashboard
   - Event creation
   - Registration link generation
   - QR code functionality
   - Email notifications

### Link Generation

The application automatically generates the following links:

- **Registration Links**: `{APP_DOMAIN}/register/{event-id}`
- **Report Links**: `{APP_DOMAIN}/report/{event-id}`
- **QR Code Links**: `{APP_DOMAIN}/qr/{registration-id}`

These links are automatically generated using the `APP_DOMAIN` environment variable, ensuring they work correctly in both local and production environments.

## File Upload Configuration

The application supports two file storage options:

### Local Storage (Development)
For local development, files are stored in the `./uploads` directory:

```bash
# Local file storage
UPLOAD_DIR=./uploads
```

### Cloudinary (Production Recommended)
For production deployments, use Cloudinary for optimized image delivery:

1. **Create Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)
2. **Get API Credentials**: Go to Dashboard → API Keys
3. **Set Environment Variables**:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Features:
- **Automatic Optimization**: Images are automatically optimized for web delivery
- **CDN Delivery**: Global CDN ensures fast image loading
- **Format Conversion**: Automatic format conversion (WebP, AVIF) for better performance
- **Responsive Images**: Automatic responsive image generation
- **Security**: Secure upload with access controls

### How It Works:
- **Development**: If Cloudinary credentials are not set, files are stored locally
- **Production**: If Cloudinary credentials are provided, all uploads go to Cloudinary
- **Fallback**: System gracefully falls back to local storage if Cloudinary fails

### Security Considerations

1. **JWT Secret**: Use a strong, unique JWT secret for production
2. **Database Security**: Use secure database credentials and connection strings
3. **HTTPS**: Always use HTTPS in production (set APP_DOMAIN with https://)
4. **Environment Variables**: Never commit .env files to version control
5. **Email Security**: Use app-specific passwords for email services
6. **File Upload Security**: Cloudinary provides secure upload with access controls

### Troubleshooting

**Links not working?**
- Check that `APP_DOMAIN` is set correctly
- Ensure the domain includes the protocol (http:// or https://)
- Verify the domain is accessible from external networks

**Database connection issues?**
- Verify `DATABASE_URL` is correct
- Check database server is running and accessible
- Ensure database user has proper permissions

**Email not sending?**
- Check SMTP credentials are correct
- Verify email provider allows app-specific passwords
- Check spam/junk folders for test emails
