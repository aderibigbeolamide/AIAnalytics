# AWS Services Setup Guide for Eventify AI

This guide will help you set up all the AWS services used in your Eventify AI application in your new AWS account.

## 📋 AWS Services Used in Your Application

Your application uses **3 AWS services**:

1. **Amazon Rekognition** - Face detection, recognition, and collection management
2. **Amazon Comprehend** - Text analysis (sentiment, key phrases, entities)
3. **Amazon Bedrock** - AI chatbot using Claude 3 Haiku model

## 🔑 Required Environment Variables

Your application needs these AWS credentials:
```
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=us-east-1
```

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Create an IAM User with Programmatic Access

1. **Log into AWS Console** → Navigate to IAM service
2. **Go to Users** → Click "Create user"
3. **User name**: `eventify-ai-user` (or your preferred name)
4. **Access type**: Select "Programmatic access" only (no AWS Console access needed)
5. **Click Next**

### Step 2: Attach Permissions to the User

You have two options:

#### Option A: Use AWS Managed Policies (Easiest - Recommended for Development)

Attach these **3 managed policies**:
- ✅ `AmazonRekognitionFullAccess`
- ✅ `ComprehendFullAccess`
- ✅ `AmazonBedrockFullAccess`

**Steps:**
1. On the "Set permissions" page, select "Attach policies directly"
2. Search for and select each policy above
3. Click "Next" → "Create user"

#### Option B: Create Custom Policy (Production - More Secure)

Click "Create policy" and use this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RekognitionPermissions",
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:CompareFaces",
        "rekognition:CreateCollection",
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:DeleteFaces",
        "rekognition:ListCollections",
        "rekognition:DetectLabels",
        "rekognition:DetectText",
        "rekognition:DetectModerationLabels"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ComprehendPermissions",
      "Effect": "Allow",
      "Action": [
        "comprehend:DetectSentiment",
        "comprehend:DetectKeyPhrases",
        "comprehend:DetectEntities",
        "comprehend:DetectDominantLanguage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "BedrockPermissions",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:*::foundation-model/*"
      ]
    }
  ]
}
```

**Name the policy**: `EventifyAI-CustomPolicy`  
**Attach it to your user**

### Step 3: Save Your Access Keys

1. After user creation, AWS will show you:
   - **Access key ID**: `AKIA...` (20 characters)
   - **Secret access key**: `wJalrXUtn...` (40 characters)
   
2. ⚠️ **CRITICAL**: Download the CSV or copy these values immediately
   - You **cannot** retrieve the secret access key again after closing this page
   - If lost, you must delete and create new keys

### Step 4: Enable Amazon Bedrock Models

**Important**: As of 2025, most Bedrock models are **automatically enabled**, but you should verify:

1. Go to **Amazon Bedrock** → **Model access** (in left sidebar)
2. Check if **Claude 3 Haiku** is enabled:
   - If status shows "Available" ✅ → You're good to go
   - If not enabled → Click "Manage model access" → Select "Claude 3 Haiku" → Submit

**Note**: Some regions may require you to submit a use case for Anthropic models on first use.

### Step 5: Set Up AWS Rekognition Face Collection

Your application will automatically create a face collection named `eventify-ai-faces` on first startup. No manual setup needed! The logs will show:
```
✅ Face collection 'eventify-ai-faces' created successfully
```

---

## 🌍 Region Selection

Your application defaults to **`us-east-1`** (N. Virginia).

### Recommended Regions for Bedrock:
- **us-east-1** (N. Virginia) ✅ - Best availability
- **us-west-2** (Oregon) ✅ - Good availability
- **eu-west-1** (Ireland) - For EU users

**To change region**: Update your `AWS_REGION` environment variable

---

## 💰 Cost Estimates (Approximate)

Based on your application usage:

### Amazon Rekognition
- **Face Detection**: $0.001 per image
- **Face Comparison**: $0.001 per face comparison
- **Face Collection Storage**: $0.01 per 1,000 faces/month
- **Estimated**: ~$10-50/month for moderate use

### Amazon Comprehend
- **Sentiment Analysis**: $0.0001 per 100 characters (minimum 300 chars)
- **Entity/Key Phrase Detection**: $0.0001 per 100 characters
- **Estimated**: ~$5-20/month for moderate use

### Amazon Bedrock (Claude 3 Haiku)
- **Input**: $0.00025 per 1K tokens (~750 words)
- **Output**: $0.00125 per 1K tokens (~750 words)
- **Estimated**: ~$20-100/month depending on chatbot usage

**Total Estimated Monthly Cost**: $35-170 for moderate usage

---

## 🔒 Security Best Practices

1. ✅ **Never commit AWS keys to Git**
   - Use environment variables only
   - Add `.env` to `.gitignore` (already done in your project)

2. ✅ **Rotate access keys regularly**
   - Rotate every 90 days minimum
   - Can create 2 keys per user for zero-downtime rotation

3. ✅ **Use minimal permissions**
   - Start with Option B (Custom Policy) for production
   - Only grant what your application needs

4. ✅ **Enable CloudTrail**
   - Monitor API calls for suspicious activity
   - Set up billing alerts

5. ✅ **Use different keys for dev/production**
   - Create separate IAM users for each environment

---

## 🧪 Testing Your Setup

After adding your AWS credentials to Replit:

1. **Check startup logs** for these messages:
   ```
   ✅ Face collection 'eventify-ai-faces' already exists (or created)
   ✅ Email service configured successfully
   ```

2. **Test each service**:
   - **Rekognition**: Upload a member photo with face detection enabled
   - **Comprehend**: Create an event with a description (sentiment analysis runs automatically)
   - **Bedrock**: Use the chatbot feature in the app

3. **Watch for errors**:
   - `⚠️ AWS credentials not configured` → Keys missing
   - `AccessDeniedException` → IAM permissions issue
   - `Region not available` → Wrong region or model not enabled

---

## 📝 Adding Credentials to Replit

Once you have your AWS keys:

1. I'll help you add them as secrets in Replit
2. You'll need to provide:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (default: us-east-1)

Just let me know when you're ready and I'll use the secure secrets tool to add them!

---

## ❓ Troubleshooting

### "AccessDeniedException" error
- **Cause**: IAM user lacks required permissions
- **Fix**: Check IAM policy includes all actions listed in Step 2

### "ModelNotFoundException" for Bedrock
- **Cause**: Model not enabled in your region
- **Fix**: Enable model access in Bedrock console (Step 4)

### "Face collection already exists" error
- **Cause**: Collection name conflict (rare)
- **Fix**: Update `collectionId` in `server/services/face-recognition-service.ts`

### High AWS costs
- **Cause**: Excessive API calls
- **Fix**: 
  - Check logs for retry loops
  - Implement caching for Comprehend results
  - Set AWS budget alerts in AWS Billing console

---

## 📚 Additional Resources

- [AWS Rekognition Pricing](https://aws.amazon.com/rekognition/pricing/)
- [AWS Comprehend Pricing](https://aws.amazon.com/comprehend/pricing/)
- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Bedrock Model Access Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)

---

## ✅ Quick Checklist

Before adding keys to Replit, ensure you've:

- [ ] Created IAM user with programmatic access
- [ ] Attached required permissions (Option A or B)
- [ ] Saved access key ID and secret access key
- [ ] Verified Bedrock model access (Claude 3 Haiku)
- [ ] Chosen your preferred AWS region
- [ ] Set up billing alerts (recommended)

---

**Need help?** Let me know if you have questions about any of these steps!
