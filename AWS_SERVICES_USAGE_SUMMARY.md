# AWS Services Usage in Eventify AI - Quick Reference

## 🎯 Services Overview

| Service | Purpose in Your App | Key Features Used |
|---------|---------------------|-------------------|
| **Amazon Rekognition** | Member verification & face recognition | Face detection, face comparison, face collection management |
| **Amazon Comprehend** | Event content analysis | Sentiment analysis, key phrase extraction, entity detection |
| **Amazon Bedrock** | AI-powered chatbot | Claude 3 Haiku model for event support conversations |

---

## 1️⃣ Amazon Rekognition - Face Recognition Service

### What it does in your app:
- **Member face enrollment**: Stores member faces in a collection
- **Face verification at events**: Compares attendee faces against enrolled members
- **Security validation**: Detects if multiple faces are in one photo
- **QR + Face validation**: Combines QR code with facial recognition for enhanced security

### Specific operations:
```typescript
// File: server/services/face-recognition-service.ts

✓ detectFaces()           - Detects faces in uploaded member photos
✓ compareFaces()          - Compares two faces for verification
✓ indexFace()             - Adds member face to the collection
✓ searchFaceByImage()     - Searches for matching face in collection
✓ deleteFace()            - Removes member face from collection
✓ initializeCollection()  - Creates 'eventify-ai-faces' collection
```

### Data stored:
- Face collection: `eventify-ai-faces`
- Face vectors (not actual images) for quick matching
- Each face is linked to a member ID

---

## 2️⃣ Amazon Comprehend - Text Analysis Service

### What it does in your app:
- **Event sentiment analysis**: Determines if event descriptions are positive/negative/neutral
- **Key phrase extraction**: Identifies important topics from event descriptions
- **Entity detection**: Finds people, places, dates, organizations mentioned
- **Image context analysis**: Analyzes text detected in event images

### Specific operations:
```typescript
// File: server/services/aws-ai-service.ts

✓ analyzeEventText()      - Full text analysis (sentiment + key phrases + entities)
✓ analyzeImageContext()   - Analyzes text/labels from images
```

### Use cases:
1. **Event creation**: Automatically analyze event descriptions for quality
2. **Content moderation**: Detect inappropriate sentiment in event details
3. **Search optimization**: Extract key topics for better event discovery
4. **Smart categorization**: Auto-tag events based on detected entities

---

## 3️⃣ Amazon Bedrock - AI Chatbot Service

### What it does in your app:
- **Event support chatbot**: Answers questions about events, registration, validation
- **Context-aware responses**: Understands if user is organization, member, or guest
- **Conversation history**: Maintains chat context across messages
- **Intent detection**: Identifies if user needs help with registration, validation, tickets, etc.

### Specific operations:
```typescript
// File: server/aws-bedrock-service.ts

✓ generateChatbotResponse()  - Generates AI responses using Claude 3 Haiku
✓ buildEventValidateKnowledgeBase() - Provides chatbot with app knowledge
```

### Model used:
- **Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`)
  - Fast and cost-effective
  - Max 500 tokens per response
  - Temperature: 0.3 (balanced creativity/accuracy)

### User types supported:
- **Organization admins**: Help with event management, member registration
- **Members**: Assistance with QR codes, face enrollment, event attendance
- **Guests**: General event information, ticket purchasing
- **General users**: Platform navigation and features

---

## 🔧 How They Work Together

### Example: Event Check-in Flow

1. **Member scans QR code** → Backend validates ticket
2. **Face recognition activates** → Rekognition compares face to enrolled photo
3. **Validation result** → If uncertain, chatbot (Bedrock) guides next steps
4. **Analytics** → Comprehend analyzes check-in patterns for insights

### Example: Event Creation Flow

1. **Organization creates event** → Enters description
2. **Comprehend analyzes text** → Extracts sentiment, key phrases, entities
3. **Image upload** → Rekognition detects labels, Comprehend analyzes text in image
4. **Event published** → Enhanced with AI-generated tags and categorization

---

## 💾 Data Flow & Storage

### Rekognition:
- **Input**: Member photos, event check-in photos
- **Storage**: AWS Rekognition Collection (face vectors only)
- **Output**: Face match confidence scores, face IDs

### Comprehend:
- **Input**: Event descriptions, image captions, user feedback
- **Storage**: No persistent storage (stateless API)
- **Output**: JSON with sentiment scores, key phrases, entities

### Bedrock:
- **Input**: User chat messages + conversation history
- **Storage**: Chat history in your MongoDB (not in AWS)
- **Output**: AI-generated text responses

---

## 📊 When Each Service is Called

| Action | Rekognition | Comprehend | Bedrock |
|--------|-------------|------------|---------|
| Member registration with photo | ✅ | ❌ | ❌ |
| Event creation | ❌ | ✅ | ❌ |
| Event check-in with face validation | ✅ | ❌ | ❌ |
| Image upload for event | ✅ | ✅ | ❌ |
| User asks chatbot a question | ❌ | ❌ | ✅ |
| Member profile update | ✅ (if photo changed) | ❌ | ❌ |

---

## 🚨 Fallback Behavior (If AWS Unavailable)

Your app gracefully handles missing AWS credentials:

```typescript
// If AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not set:

✓ Rekognition → Returns warning, allows QR-only validation
✓ Comprehend  → Skips text analysis, event still created
✓ Bedrock     → Falls back to knowledge base responses (no AI)
```

**Result**: Your app works even without AWS, but with reduced features.

---

## 📍 Files to Check

If you want to modify how each service is used:

### Rekognition:
- `server/services/face-recognition-service.ts` - Main face recognition logic
- `server/routes.ts` - Member enrollment endpoints

### Comprehend:
- `server/services/aws-ai-service.ts` - Text & image analysis
- `server/routes.ts` - Event creation endpoints

### Bedrock:
- `server/aws-bedrock-service.ts` - Chatbot logic and knowledge base
- `server/routes.ts` - Chat endpoints

---

## 🎯 Quick Start Checklist

After setting up AWS IAM user (see main guide):

1. ✅ Add these 3 environment variables to Replit:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (default: us-east-1)

2. ✅ Restart your application

3. ✅ Check logs for confirmation:
   ```
   ✅ Face collection 'eventify-ai-faces' created successfully
   ✅ Email service configured successfully
   ```

4. ✅ Test each feature:
   - Upload member photo (tests Rekognition)
   - Create event with description (tests Comprehend)
   - Ask chatbot a question (tests Bedrock)

---

**Next Step**: Follow the detailed setup instructions in `AWS_SERVICES_SETUP_GUIDE.md` to create your IAM user and get your access keys!
