// Facial Recognition Implementation Guide for EventValidate
// This file provides implementation patterns for facial recognition in secured event registration

/**
 * IMPLEMENTATION GUIDE: Facial Recognition for Secured Event Registration
 * 
 * Based on your current EventValidate architecture, here's how to implement facial recognition
 * for secured event registration (not tickets). This system would work with your existing
 * EventRegistration schema which already has a 'facePhotoPath' field.
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Registration Phase: Store face photo during event registration
 * 2. Validation Phase: Compare live face at event entrance with stored photo
 * 3. Verification Phase: Admin dashboard for manual verification if needed
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for face photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/face-photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `face-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const facePhotoUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, WebP) are allowed'));
    }
  }
});

/**
 * STEP 1: REGISTRATION WITH FACE PHOTO
 * 
 * To implement facial recognition, you would modify your existing event registration
 * endpoint in server/mongo-routes.ts to include face photo capture:
 * 
 * Example modification for POST /api/events/:id/register:
 * 
 * app.post("/api/events/:id/register", 
 *   facePhotoUpload.single('facePhoto'),  // Add this middleware
 *   async (req: Request, res: Response) => {
 *     try {
 *       // Your existing registration logic...
 *       
 *       // Add face photo processing
 *       let facePhotoPath;
 *       if (req.file) {
 *         facePhotoPath = req.file.path;
 *         
 *         // Optional: Extract face features for comparison
 *         const faceFeatures = await extractFaceFeatures(facePhotoPath);
 *         // Store faceFeatures in database for faster comparison
 *       }
 *       
 *       // Create registration with face photo
 *       const registration = new EventRegistration({
 *         // ... existing fields
 *         facePhotoPath,
 *         // faceFeatures: faceFeatures // if using feature extraction
 *       });
 *       
 *       await registration.save();
 *       // ... rest of your logic
 *     } catch (error) {
 *       // Handle errors
 *     }
 *   }
 * );
 */

/**
 * STEP 2: FACE COMPARISON UTILITIES
 * 
 * These are the core functions you would need to implement facial recognition.
 * You can choose from several approaches:
 */

// Option A: Browser-based face recognition using face-api.js
export const browserFaceRecognitionScript = `
/**
 * CLIENT-SIDE FACE RECOGNITION IMPLEMENTATION
 * 
 * Add this to your frontend for real-time face comparison.
 * You'll need to install: npm install face-api.js
 * 
 * Usage in your React component:
 */

import * as faceapi from 'face-api.js';

class FaceRecognitionService {
  static async initializeFaceAPI() {
    // Load models (do this once in your app initialization)
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
  }

  static async extractFaceDescriptor(imageElement) {
    const detection = await faceapi.detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection ? detection.descriptor : null;
  }

  static async compareFaces(referenceDescriptor, liveDescriptor, threshold = 0.6) {
    if (!referenceDescriptor || !liveDescriptor) return false;
    
    const distance = faceapi.euclideanDistance(referenceDescriptor, liveDescriptor);
    return distance < threshold; // Lower distance = more similar
  }

  static async verifyRegistration(registrationPhoto, liveVideo) {
    try {
      const referenceDescriptor = await this.extractFaceDescriptor(registrationPhoto);
      const liveDescriptor = await this.extractFaceDescriptor(liveVideo);
      
      const isMatch = await this.compareFaces(referenceDescriptor, liveDescriptor);
      const confidence = isMatch ? 1 - faceapi.euclideanDistance(referenceDescriptor, liveDescriptor) : 0;
      
      return {
        isMatch,
        confidence: Math.round(confidence * 100),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Face verification error:', error);
      return { isMatch: false, error: error.message };
    }
  }
}

export default FaceRecognitionService;
`;

// Option B: Server-side face recognition using Python/OpenCV
export const pythonFaceRecognitionScript = `
"""
SERVER-SIDE FACE RECOGNITION IMPLEMENTATION

If you prefer server-side processing, create a Python microservice
that your Node.js app can call via HTTP requests.

Requirements:
- pip install face_recognition opencv-python pillow

File: face_recognition_service.py
"""

import face_recognition
import cv2
import numpy as np
from PIL import Image
import base64
import io
import json

class FaceRecognitionService:
    @staticmethod
    def extract_face_encoding(image_path_or_base64):
        """Extract face encoding from image file or base64 string"""
        try:
            if image_path_or_base64.startswith('data:image'):
                # Handle base64 image
                image_data = base64.b64decode(image_path_or_base64.split(',')[1])
                image = Image.open(io.BytesIO(image_data))
                image_array = np.array(image)
            else:
                # Handle file path
                image_array = face_recognition.load_image_file(image_path_or_base64)
            
            # Find face encodings
            face_encodings = face_recognition.face_encodings(image_array)
            
            if len(face_encodings) > 0:
                return face_encodings[0].tolist()  # Convert to list for JSON serialization
            else:
                return None
                
        except Exception as e:
            print(f"Error extracting face encoding: {e}")
            return None
    
    @staticmethod
    def compare_faces(known_encoding, unknown_encoding, tolerance=0.6):
        """Compare two face encodings"""
        if not known_encoding or not unknown_encoding:
            return False, 0
            
        known_encoding_np = np.array(known_encoding)
        unknown_encoding_np = np.array(unknown_encoding)
        
        # Calculate face distance
        face_distance = face_recognition.face_distance([known_encoding_np], unknown_encoding_np)[0]
        
        # Determine if faces match
        is_match = face_distance <= tolerance
        confidence = max(0, (1 - face_distance) * 100)  # Convert to percentage
        
        return is_match, round(confidence, 2)

# Flask API wrapper (optional)
from flask import Flask, request, jsonify

app = Flask(__name__)
face_service = FaceRecognitionService()

@app.route('/extract-encoding', methods=['POST'])
def extract_encoding():
    try:
        data = request.json
        image_data = data.get('image')
        
        encoding = face_service.extract_face_encoding(image_data)
        
        if encoding:
            return jsonify({'success': True, 'encoding': encoding})
        else:
            return jsonify({'success': False, 'error': 'No face detected'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/compare-faces', methods=['POST'])
def compare_faces():
    try:
        data = request.json
        known_encoding = data.get('known_encoding')
        unknown_encoding = data.get('unknown_encoding')
        
        is_match, confidence = face_service.compare_faces(known_encoding, unknown_encoding)
        
        return jsonify({
            'success': True,
            'is_match': is_match,
            'confidence': confidence
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
`;

/**
 * STEP 3: DATABASE SCHEMA UPDATES
 * 
 * Your EventRegistration schema already includes 'facePhotoPath'.
 * You might want to add these additional fields:
 */
export const schemaEnhancements = `
// Add to EventRegistration interface in shared/mongoose-schema.ts

export interface IEventRegistration extends Document {
  // ... existing fields
  facePhotoPath?: string;           // Already exists
  faceEncoding?: number[];          // Face feature vector for comparison
  faceVerificationStatus?: string;  // 'pending', 'verified', 'failed', 'manual_review'
  faceVerificationAttempts?: Array<{
    timestamp: Date;
    result: boolean;
    confidence: number;
    validatedBy?: mongoose.Types.ObjectId;
  }>;
}

// Update the EventRegistration schema
const EventRegistrationSchema = new Schema<IEventRegistration>({
  // ... existing fields
  facePhotoPath: { type: String },
  faceEncoding: [{ type: Number }],
  faceVerificationStatus: { type: String, default: 'pending' },
  faceVerificationAttempts: [{ type: Schema.Types.Mixed }],
}, { timestamps: true });
`;

/**
 * STEP 4: VALIDATION ENDPOINT
 * 
 * Create an endpoint for face verification during event check-in
 */
export const validationEndpointExample = `
// Add to server/mongo-routes.ts

app.post("/api/events/:eventId/verify-face", 
  facePhotoUpload.single('livePhoto'),
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { registrationId, email } = req.body;
      
      // Find the registration
      const registration = await EventRegistration.findOne({
        _id: registrationId,
        eventId,
        email
      });
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      if (!registration.facePhotoPath) {
        return res.status(400).json({ message: "No reference face photo available" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "Live photo required" });
      }
      
      // Compare faces (using your chosen method)
      const verificationResult = await compareFacePhotos(
        registration.facePhotoPath,
        req.file.path
      );
      
      // Update verification attempt
      registration.faceVerificationAttempts = registration.faceVerificationAttempts || [];
      registration.faceVerificationAttempts.push({
        timestamp: new Date(),
        result: verificationResult.isMatch,
        confidence: verificationResult.confidence
      });
      
      if (verificationResult.isMatch) {
        registration.faceVerificationStatus = 'verified';
        registration.validatedAt = new Date();
        // registration.validatedBy = req.user?.id; // If you have user context
      } else {
        registration.faceVerificationStatus = 'failed';
      }
      
      await registration.save();
      
      // Clean up temporary file
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        verified: verificationResult.isMatch,
        confidence: verificationResult.confidence,
        status: registration.faceVerificationStatus
      });
      
    } catch (error) {
      console.error("Face verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  }
);
`;

/**
 * STEP 5: FRONTEND IMPLEMENTATION
 * 
 * Create React components for face capture and verification
 */
export const frontendImplementationGuide = `
// Frontend Face Capture Component

import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';

const FaceCaptureComponent = ({ onPhotoCapture, registrationData }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    onPhotoCapture(imageSrc);
  }, [webcamRef, onPhotoCapture]);

  const verifyFace = async () => {
    if (!capturedImage) return;
    
    setIsVerifying(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('livePhoto', blob, 'live-photo.jpg');
      formData.append('registrationId', registrationData.id);
      formData.append('email', registrationData.email);
      
      // Send to verification endpoint
      const verificationResponse = await fetch(\`/api/events/\${registrationData.eventId}/verify-face\`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('token')}\`
        }
      });
      
      const result = await verificationResponse.json();
      
      if (result.verified) {
        alert(\`Face verified successfully! Confidence: \${result.confidence}%\`);
      } else {
        alert(\`Face verification failed. Confidence: \${result.confidence}%\`);
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      alert('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="face-capture-container">
      <h3>Face Verification</h3>
      
      <div className="webcam-container">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={400}
          height={300}
          videoConstraints={{
            width: 400,
            height: 300,
            facingMode: "user"
          }}
        />
      </div>
      
      <div className="controls">
        <button onClick={capture} disabled={isVerifying}>
          📸 Capture Photo
        </button>
        
        {capturedImage && (
          <button onClick={verifyFace} disabled={isVerifying}>
            {isVerifying ? '🔄 Verifying...' : '✅ Verify Face'}
          </button>
        )}
      </div>
      
      {capturedImage && (
        <div className="preview">
          <h4>Captured Photo:</h4>
          <img src={capturedImage} alt="Captured" width={200} height={150} />
        </div>
      )}
    </div>
  );
};

export default FaceCaptureComponent;
`;

/**
 * IMPLEMENTATION SUMMARY FOR YOUR CODEBASE:
 * 
 * 1. Your EventRegistration schema already has 'facePhotoPath' - you're ready!
 * 
 * 2. Choose your approach:
 *    - Browser-based (face-api.js): Real-time, client-side processing
 *    - Server-based (Python): More accurate, server-side processing
 *    - Hybrid: Combine both for best results
 * 
 * 3. Integration points in your existing code:
 *    - Modify /api/events/:id/register to accept face photos
 *    - Add /api/events/:eventId/verify-face endpoint
 *    - Update frontend registration form to include camera
 *    - Add face verification to your event check-in process
 * 
 * 4. Security considerations:
 *    - Encrypt face encodings in database
 *    - Add rate limiting to verification endpoints
 *    - Implement fallback manual verification
 *    - GDPR compliance for biometric data
 * 
 * 5. Testing approach:
 *    - Test with different lighting conditions
 *    - Test with glasses, masks, etc.
 *    - Set appropriate confidence thresholds
 *    - Implement manual override for edge cases
 */

// Utility function placeholder - implement based on your chosen approach
async function compareFacePhotos(referencePath: string, livePath: string) {
  // This would contain your actual face comparison logic
  // Return { isMatch: boolean, confidence: number }
  throw new Error('Implement face comparison logic based on your chosen approach');
}

export { compareFacePhotos };