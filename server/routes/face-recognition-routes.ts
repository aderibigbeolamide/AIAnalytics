import { Express, Request, Response } from 'express';
import multer from 'multer';
import { faceRecognitionService } from '../services/face-recognition-service';
import { authenticateToken } from './auth-routes';
// Define AuthenticatedRequest type locally
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for AWS Rekognition
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed for face recognition'));
    }
  }
});

export function registerFaceRecognitionRoutes(app: Express) {
  
  // ================ FACE RECOGNITION ENDPOINTS ================
  
  /**
   * GET /api/face-recognition/status - Get service status
   */
  app.get("/api/face-recognition/status", (req: Request, res: Response) => {
    try {
      const status = faceRecognitionService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting face recognition status:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to get service status" 
      });
    }
  });

  /**
   * POST /api/face-recognition/detect - Detect faces in an image
   */
  app.post("/api/face-recognition/detect", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided"
        });
      }

      const result = await faceRecognitionService.detectFaces(req.file.buffer);
      res.json(result);
    } catch (error) {
      console.error("Error detecting faces:", error);
      res.status(500).json({
        success: false,
        error: "Failed to detect faces"
      });
    }
  });

  /**
   * POST /api/face-recognition/validate-image - Validate if image is suitable for face recognition
   */
  app.post("/api/face-recognition/validate-image", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided"
        });
      }

      const result = await faceRecognitionService.validateImage(req.file.buffer);
      res.json(result);
    } catch (error) {
      console.error("Error validating image:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate image"
      });
    }
  });

  /**
   * POST /api/face-recognition/compare - Compare two faces
   */
  app.post("/api/face-recognition/compare", upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetImage', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.sourceImage || !files.targetImage) {
        return res.status(400).json({
          success: false,
          error: "Both source and target images are required"
        });
      }

      const threshold = req.body.threshold ? parseFloat(req.body.threshold) : 85;
      
      const result = await faceRecognitionService.compareFaces(
        files.sourceImage[0].buffer,
        files.targetImage[0].buffer,
        threshold
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error comparing faces:", error);
      res.status(500).json({
        success: false,
        error: "Failed to compare faces"
      });
    }
  });

  /**
   * POST /api/face-recognition/register - Register a new face (requires authentication)
   */
  app.post("/api/face-recognition/register", authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided"
        });
      }

      const { userId, memberName, memberEmail } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required"
        });
      }

      // First validate the image
      const validation = await faceRecognitionService.validateImage(req.file.buffer);
      if (!validation.success) {
        return res.status(400).json(validation);
      }

      // Register the face
      const result = await faceRecognitionService.registerFace(
        req.file.buffer,
        userId,
        {
          memberName,
          memberEmail,
          organizationId: req.user?.organizationId,
          registeredBy: req.user?.id,
          registeredAt: new Date().toISOString(),
        }
      );

      res.json(result);
    } catch (error) {
      console.error("Error registering face:", error);
      res.status(500).json({
        success: false,
        error: "Failed to register face"
      });
    }
  });

  /**
   * POST /api/face-recognition/search - Search for a matching face
   */
  app.post("/api/face-recognition/search", authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided"
        });
      }

      const threshold = req.body.threshold ? parseFloat(req.body.threshold) : 85;
      
      const result = await faceRecognitionService.searchFace(
        req.file.buffer,
        threshold
      );

      res.json(result);
    } catch (error) {
      console.error("Error searching face:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search for face"
      });
    }
  });

  /**
   * DELETE /api/face-recognition/faces/:faceId - Delete a registered face
   */
  app.delete("/api/face-recognition/faces/:faceId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { faceId } = req.params;
      
      if (!faceId) {
        return res.status(400).json({
          success: false,
          error: "Face ID is required"
        });
      }

      const result = await faceRecognitionService.deleteFace(faceId);
      res.json(result);
    } catch (error) {
      console.error("Error deleting face:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete face"
      });
    }
  });

  /**
   * POST /api/face-recognition/validate-attendance - Validate event attendance using face recognition
   */
  app.post("/api/face-recognition/validate-attendance", authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided"
        });
      }

      const { eventId } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: "Event ID is required"
        });
      }

      // Search for matching face
      const searchResult = await faceRecognitionService.searchFace(req.file.buffer, 85);
      
      if (!searchResult.success) {
        return res.json(searchResult);
      }

      if (!searchResult.matchFound) {
        try {
          // Import MongoDB storage to get event details for better error messaging
          const { mongoStorage } = await import('../mongodb-storage');
          let event = null;
          
          // Handle both ObjectId and string eventId formats
          try {
            event = await mongoStorage.getEvent(eventId);
          } catch (eventError) {
            console.log(`Could not fetch event details for eventId: ${eventId}`, eventError.message);
            // Try to get event list and find by string ID if ObjectId fails
            const events = await mongoStorage.getEvents();
            event = events.find(e => e._id.toString() === eventId || e.id === eventId);
          }
          
          return res.json({
            success: true,
            validated: false,
            validationStatus: "invalid",
            message: "No matching face found in registered members. Please ensure you registered for this event with a face photo.",
            memberName: req.body.memberName || "Unknown",
            event: event ? { name: event.name, id: eventId } : { name: "Event", id: eventId },
            ...searchResult
          });
        } catch (error) {
          console.error('Error in face validation no-match handler:', error);
          return res.json({
            success: true,
            validated: false,
            validationStatus: "invalid",
            message: "No matching face found in registered members. Please ensure you registered for this event with a face photo.",
            memberName: req.body.memberName || "Unknown",
            event: { name: "Event", id: eventId },
            ...searchResult
          });
        }
      }

      // Get the best match
      const bestMatch = searchResult.matches[0];
      
      try {
        // Import MongoDB storage to check registration
        const { mongoStorage } = await import('../mongodb-storage');
        
        // Parse the user ID to extract information (format: eventId_firstName_lastName_timestamp)
        const userIdParts = bestMatch.userId.split('_');
        const matchedEventId = userIdParts[0];
        const matchedFirstName = userIdParts[1];
        const matchedLastName = userIdParts[2];
        
        // Check if the matched face is registered for this event
        // Ensure both IDs are compared as strings
        if (matchedEventId !== eventId.toString()) {
          console.log(`Event ID mismatch: matched=${matchedEventId}, requested=${eventId.toString()}`);
          return res.json({
            success: true,
            validated: false,
            message: `Face recognized but user is registered for a different event. Please check your registration.`,
            confidence: bestMatch.similarity,
            debug: {
              matchedEventId,
              requestedEventId: eventId.toString(),
              matchedUser: `${matchedFirstName} ${matchedLastName}`
            }
          });
        }
        
        // Get all registrations for this event to find the specific registration
        const eventRegistrations = await mongoStorage.getEventRegistrations(eventId);
        const matchingRegistration = eventRegistrations.find(reg => 
          (reg.registrationData?.faceUserId === bestMatch.userId) ||
          (reg.firstName?.toLowerCase() === matchedFirstName?.toLowerCase() && 
           reg.lastName?.toLowerCase() === matchedLastName?.toLowerCase())
        );
        
        if (!matchingRegistration) {
          return res.json({
            success: true,
            validated: false,
            message: `Face recognized but no registration found for this event. Please contact support.`,
            confidence: bestMatch.similarity || bestMatch.confidence || 0
          });
        }
        
        // Check registration status
        if (matchingRegistration.status === 'inactive' || matchingRegistration.status === 'cancelled') {
          return res.json({
            success: true,
            validated: false,
            message: `Registration is ${matchingRegistration.status}. Please contact support.`,
            confidence: bestMatch.similarity || bestMatch.confidence || 0,
            registrationInfo: {
              name: `${matchingRegistration.firstName} ${matchingRegistration.lastName}`,
              status: matchingRegistration.status
            }
          });
        }
        
        // Mark attendance
        await mongoStorage.updateEventRegistration((matchingRegistration._id as any).toString(), {
          status: 'attended',
          validatedAt: new Date(),
          validatedBy: req.user?.id,
          validationMethod: 'face_recognition'
        });
        
        // Get event details - handle both ObjectId and string formats
        let event = null;
        try {
          event = await mongoStorage.getEvent(eventId);
        } catch (eventError) {
          console.log(`Could not fetch event details for eventId: ${eventId}`, eventError.message);
          // Try to get event list and find by string ID if ObjectId fails
          const events = await mongoStorage.getEvents();
          event = events.find(e => e._id.toString() === eventId || e.id === eventId);
        }
        
        res.json({
          success: true,
          validated: true,
          validationStatus: "valid",
          message: `Welcome ${matchingRegistration.firstName} ${matchingRegistration.lastName}! Attendance marked successfully.`,
          memberName: `${matchingRegistration.firstName} ${matchingRegistration.lastName}`,
          event: event ? { name: event.name, id: eventId } : { name: "Event", id: eventId },
          confidence: bestMatch.similarity || bestMatch.confidence || 0,
          registrationInfo: {
            id: (matchingRegistration._id as any).toString(),
            name: `${matchingRegistration.firstName} ${matchingRegistration.lastName}`,
            email: matchingRegistration.email,
            registrationType: matchingRegistration.registrationType,
            uniqueId: matchingRegistration.uniqueId
          },
          match: bestMatch,
          eventId,
          validatedAt: new Date().toISOString(),
        });
        
      } catch (dbError) {
        console.error("Database error during validation:", dbError);
        res.json({
          success: true,
          validated: false,
          message: `Face recognized but unable to verify registration. Please try again or use QR code validation.`,
          confidence: bestMatch.similarity || bestMatch.confidence || 0
        });
      }

    } catch (error) {
      console.error("Error validating attendance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate attendance"
      });
    }
  });
}