# Cloudinary Setup Guide

## Quick Setup for Production File Uploads

### 1. Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Credentials
1. Log into your Cloudinary dashboard
2. Go to **Dashboard** → **API Keys**
3. Copy the following values:
   - **Cloud Name** (e.g., `dc1234567`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Set Environment Variables

#### For Local Development:
Add to your `.env` file:
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### For Production Deployment:

**Render:**
1. Go to your service dashboard
2. Navigate to **Environment**
3. Add the three variables above

**Railway:**
1. Go to your project dashboard
2. Click **Variables**
3. Add the three variables above

**Vercel:**
1. Go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add the three variables above

**Heroku:**
```bash
heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name
heroku config:set CLOUDINARY_API_KEY=your-api-key
heroku config:set CLOUDINARY_API_SECRET=your-api-secret
```

### 4. How It Works

Once configured, the application automatically:

- **Detects Cloudinary**: If all three environment variables are set, uses Cloudinary
- **Falls Back to Local**: If any variable is missing, uses local file storage
- **Optimizes Images**: Automatically compresses and optimizes uploaded images
- **CDN Delivery**: Serves images through Cloudinary's global CDN
- **Secure URLs**: Generates secure HTTPS URLs for all uploaded files

### 5. File Organization

Files are automatically organized in Cloudinary:
- **Payment Receipts**: `eventvalidate/payment-receipts/`
- **Face Recognition**: `eventvalidate/face-recognition/`
- **CSV Files**: `eventvalidate/csv-validation/`

### 6. Benefits

✅ **Free Tier**: 25GB storage, 25GB bandwidth/month  
✅ **Auto Optimization**: Images optimized for web delivery  
✅ **Global CDN**: Fast loading worldwide  
✅ **Security**: Secure uploads with access controls  
✅ **Scalability**: Scales automatically with your application  
✅ **Transformations**: Real-time image transformations  

### 7. Testing

To test if Cloudinary is working:

1. Upload a payment receipt during event registration
2. Check the browser network tab - image URLs should start with `https://res.cloudinary.com`
3. View the uploaded image in the admin dashboard
4. Check your Cloudinary dashboard for uploaded files

### Troubleshooting

**Images not uploading to Cloudinary?**
- Verify all three environment variables are set correctly
- Check server logs for Cloudinary errors
- Ensure your Cloudinary account is active

**Still using local storage?**
- Check if all three Cloudinary variables are present
- Restart your application after setting environment variables
- Look for the log message: "✅ Cloudinary configured for file uploads"

**Need help?**
- Check [Cloudinary Documentation](https://cloudinary.com/documentation)
- Contact support through your Cloudinary dashboard