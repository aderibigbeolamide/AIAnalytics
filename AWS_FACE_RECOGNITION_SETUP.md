# AWS Face Recognition Setup Guide for EventValidate

## What You Need to Provide

### 1. AWS Account & Credentials
You need an active AWS account and programmatic access credentials:

- **AWS Access Key ID** - Your access key identifier
- **AWS Secret Access Key** - Your secret access key  
- **AWS Region** - The AWS region (recommended: `us-east-1`, `us-west-2`, or `eu-west-1`)

### 2. AWS IAM Permissions
Your AWS user/role needs these specific permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:CompareFaces", 
        "rekognition:CreateCollection",
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:DeleteFaces",
        "rekognition:ListCollections"
      ],
      "Resource": "*"
    }
  ]
}
```

## How to Get AWS Credentials

### Step 1: Create AWS Account
1. Go to [AWS Console](https://aws.amazon.com/)
2. Sign up for a new account (you get 12 months free tier)
3. Complete account verification

### Step 2: Create IAM User for Rekognition
1. Go to **IAM** service in AWS Console
2. Click **Users** → **Add User**
3. Set username: `eventvalidate-rekognition`
4. Select **Programmatic access**
5. Click **Next: Permissions**
6. Choose **Attach existing policies directly**
7. Search and select: `AmazonRekognitionFullAccess`
8. Click **Next** through remaining steps
9. **Download the CSV** with your credentials

### Step 3: Set Environment Variables
Add these to your `.env` file:

```bash
# AWS Face Recognition Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here  
AWS_REGION=us-east-1
```

## How to Use Face Recognition in Your EventValidate Project

### 1. Member Face Registration
```javascript
// Register a member's face during signup or profile update
const formData = new FormData();
formData.append('image', faceImageFile);
formData.append('userId', member.id);
formData.append('memberName', member.name);
formData.append('memberEmail', member.email);

const response = await fetch('/api/face-recognition/register', {
  method: 'POST',
  headers: getAuthHeaders(),
  body: formData
});
```

### 2. Event Attendance Validation
```javascript
// Validate attendance using face recognition at event checkin
const formData = new FormData();
formData.append('image', capturedFaceImage);
formData.append('eventId', eventId);

const response = await fetch('/api/face-recognition/validate-attendance', {
  method: 'POST', 
  headers: getAuthHeaders(),
  body: formData
});

const result = await response.json();
if (result.validated) {
  // Mark member as attended
  console.log(`Welcome ${result.match.userId}!`);
}
```

### 3. Face Detection & Validation
```javascript
// Check if uploaded image is suitable for face recognition
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/face-recognition/validate-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  // Image is good for face recognition
  console.log('Face detected with confidence:', result.faceDetails.confidence);
}
```

## API Endpoints Available

### Public Endpoints (No Authentication Required)
- `GET /api/face-recognition/status` - Check service status
- `POST /api/face-recognition/detect` - Detect faces in image
- `POST /api/face-recognition/validate-image` - Validate image quality
- `POST /api/face-recognition/compare` - Compare two faces

### Protected Endpoints (Authentication Required) 
- `POST /api/face-recognition/register` - Register member face
- `POST /api/face-recognition/search` - Search for matching face
- `POST /api/face-recognition/validate-attendance` - Validate event attendance
- `DELETE /api/face-recognition/faces/:faceId` - Delete registered face

## Use Cases for Your EventValidate System

### 1. **Member Registration Enhancement**
- Members upload face photos during signup
- System validates photo quality automatically
- Faces stored in secure AWS collection

### 2. **Event Check-in Automation** 
- Replace manual QR code scanning
- Camera captures attendee face at entrance
- Instant recognition and attendance marking
- Works even if member forgets phone/QR code

### 3. **Enhanced Security**
- Prevent unauthorized event access
- Detect if someone tries to use another person's registration
- Confidence scoring for security decisions

### 4. **Analytics & Insights**
- Track actual vs registered attendance
- Age and demographic insights (optional)
- Emotion analysis for event feedback

## Pricing Information

### AWS Rekognition Costs (as of 2025)
- **Face Detection**: $0.001 per image (first 1M images/month)
- **Face Comparison**: $0.001 per comparison
- **Face Search**: $0.001 per search
- **Face Storage**: $0.01 per 1,000 face metadata/month

### Example Monthly Cost for 1000 Members
- 1000 face registrations: $1.00
- 5000 attendance validations: $5.00  
- Face metadata storage: $0.01
- **Total: ~$6.01/month**

## Security & Privacy Notes

### Data Storage
- Face images are processed by AWS but not permanently stored
- Only face mathematical vectors (metadata) are stored
- Original images remain in your control
- GDPR/privacy compliant when configured properly

### Best Practices
- Always get explicit consent before face registration
- Provide easy opt-out mechanism
- Store minimal necessary data
- Use HTTPS for all face recognition requests
- Implement rate limiting to prevent abuse

## Testing the Integration

### 1. Check Service Status
```bash
curl http://localhost:5000/api/face-recognition/status
```

### 2. Test Face Detection
```bash
curl -X POST -F "image=@test-face.jpg" \
  http://localhost:5000/api/face-recognition/detect
```

### 3. Validate Image Quality
```bash
curl -X POST -F "image=@member-photo.jpg" \
  http://localhost:5000/api/face-recognition/validate-image
```

## Troubleshooting

### Common Issues
1. **"AWS credentials not configured"** - Add AWS keys to .env file
2. **"Invalid image format"** - Use JPEG or PNG only
3. **"No face detected"** - Ensure clear, well-lit face photo
4. **"Multiple faces detected"** - Use photos with single person only
5. **"Face confidence too low"** - Use higher quality, clearer images

### Support
- AWS Rekognition Documentation: https://docs.aws.amazon.com/rekognition/
- AWS Support: Available through your AWS account
- EventValidate Integration: Check server logs for detailed error messages

## Next Steps

1. **Get AWS credentials** from AWS Console
2. **Add environment variables** to your .env file
3. **Test the integration** using the provided endpoints
4. **Build frontend components** for face capture and registration
5. **Integrate with your event check-in flow**

Your EventValidate system is now ready for advanced face recognition capabilities!