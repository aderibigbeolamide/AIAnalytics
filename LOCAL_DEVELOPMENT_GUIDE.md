# Local Development Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Environment Setup

Create a `.env` file in your project root with these variables:

```env
# Database Configuration
DATABASE_URL=mongodb+srv://hafiztech56:eventdb@eventdb.b5av4hv.mongodb.net/eventvalidate?retryWrites=true&w=majority

# JWT Security
JWT_SECRET=0FYImUq+BQfcvVsswkOQNqFGlH84rVAnaoEfmKDNWgPMY6GKeU9qOlzSOUg7EwvhVq4iq/WtAjFlbDZ1encTag==

# Application Environment
NODE_ENV=development
PORT=5000
APP_DOMAIN=http://localhost:5000

# Email Service
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=admin@eventifyai.com
SMTP_PASS=j8u50ptu9WFD

# Security Keys
ENCRYPTION_KEY=e61c17a8c729295d7bd7e4cd4a198c1a

# File Upload - Cloudinary
CLOUDINARY_CLOUD_NAME=dkiia0lv5
CLOUDINARY_API_KEY=461936227434389
CLOUDINARY_API_SECRET=Q2II0PkItnayeL95T2DKr1Oi-LE

# Payment Integration
PAYSTACK_SECRET_KEY=sk_test_65c02f73fb59e56d3c9f97475ba5b29d1e3ec263
PAYSTACK_PUBLIC_KEY=pk_test_e3492bece8a7b8ac688b7d576471a64f8e1c6955

# AWS Configuration (Optional - for AI features)
AWS_ACCESS_KEY_ID=AKIA6FSFDS7BFD55B776
AWS_SECRET_ACCESS_KEY=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  
AWS_REGION=us-east-1

# Frontend Configuration
VITE_GA_MEASUREMENT_ID=G-DDXDLBYJ0K
VITE_GTM_ID=GTM-XXXXXX

# OpenAI Integration
OPENAI_API_KEY=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
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Fixing MongoDB Connection Issues

If you see timeout errors like:
```
MongooseError: Operation `events.find()` buffering timed out after 10000ms
```

Try these solutions:

### Option 1: Update MongoDB Connection String
Add connection options to your DATABASE_URL:
```env
DATABASE_URL=mongodb+srv://hafiztech56:eventdb@eventdb.b5av4hv.mongodb.net/eventvalidate?retryWrites=true&w=majority&connectTimeoutMS=30000&socketTimeoutMS=30000
```

### Option 2: Check Network/Firewall
- Ensure your IP is whitelisted in MongoDB Atlas
- Check if your firewall/antivirus is blocking the connection
- Try using a VPN if connection issues persist

### Option 3: Use Local MongoDB (Alternative)
If cloud connection keeps failing, install MongoDB locally:
```bash
# Install MongoDB Community Edition
# Then update your DATABASE_URL to:
DATABASE_URL=mongodb://localhost:27017/eventvalidate
```

## Default Login Credentials

After setup, you can login with:

**Admin Account:**
- Username: `admin`
- Password: `password123`

**Super Admin Account:**
- Username: `superadmin` 
- Password: `superadmin2025!`

## AWS Services (Optional)

The AI features (event analysis) use AWS services. If you see subscription errors:
- AWS Comprehend and Rekognition require paid subscriptions
- The app will work fine without these features
- AI analysis will be skipped automatically if services aren't available

## Troubleshooting

1. **Port already in use**: Change PORT in .env file
2. **MongoDB timeout**: Check connection string and network
3. **Missing dependencies**: Run `npm install` again
4. **Email not working**: Verify SMTP credentials
5. **File upload issues**: Check Cloudinary configuration

## Development Tips

- The app uses MongoDB as primary database
- Frontend runs on Vite with hot reload
- Backend API runs on Express with TypeScript
- All secrets are environment-based for easy deployment