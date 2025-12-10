import type { Express, Request, Response } from "express";
import { authenticateToken, type AuthenticatedRequest } from "./auth-routes";
import { RegistrationService } from "../services/registration-service";
import { notificationService } from "../services/notification-service";
import { mongoStorage } from "../mongodb-storage";
import { z } from "zod";

const registrationCreateSchema = z.object({
  eventId: z.string(),
  registrationType: z.enum(["member", "guest", "invitee"]),
  memberId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestAuxiliaryBody: z.string().optional(),
  guestPost: z.string().optional(),
  customFieldData: z.record(z.any()).optional(),
  paymentReceiptUrl: z.string().optional(),
  paymentAmount: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export function registerRegistrationRoutes(app: Express) {
  // Create event registration
  app.post("/api/registrations", async (req: Request, res: Response) => {
    try {
      const registrationData = registrationCreateSchema.parse(req.body);
      
      const registration = await RegistrationService.createRegistration(
        registrationData.eventId,
        registrationData
      );

      // Get event details for notification
      const event = await mongoStorage.getEvent(registrationData.eventId);
      
      // Send registration confirmation email
      if (event) {
        await notificationService.notifyRegistrationSuccess({
          registration,
          event,
          qrCode: registration.qrCodeImage
        });
      }
      
      res.status(201).json({
        message: "Registration created successfully",
        registration
      });
    } catch (error: any) {
      console.error("Error creating registration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get registration by ID
  app.get("/api/registrations/:id", async (req: Request, res: Response) => {
    try {
      const registration = await RegistrationService.getRegistrationById(req.params.id);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      res.json(registration);
    } catch (error) {
      console.error("Error getting registration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update registration status
  app.patch("/api/registrations/:id/status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status } = req.body;
      
      const registration = await RegistrationService.updateRegistrationStatus(req.params.id, status);
      
      res.json({
        message: "Registration status updated successfully",
        registration
      });
    } catch (error) {
      console.error("Error updating registration status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate attendance via QR code
  app.post("/api/registrations/validate-qr", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('🔍 QR validation request body:', req.body);
      console.log('🔍 QR validation request keys:', Object.keys(req.body));
      
      const { qrCode } = req.body;
      
      console.log('🔍 Extracted qrCode:', qrCode);
      console.log('🔍 qrCode type:', typeof qrCode);
      console.log('🔍 qrCode length:', qrCode?.length);
      
      if (!qrCode) {
        console.log('❌ QR code validation failed: No qrCode provided');
        return res.status(400).json({ message: "QR code is required" });
      }

      const registration = await RegistrationService.getRegistrationByQRCode(qrCode);
      
      if (!registration) {
        return res.status(404).json({ message: "Invalid QR code or registration not found" });
      }

      // Update attendance
      const updatedRegistration = await RegistrationService.validateAttendance(
        registration.id,
        "qr_code"
      );

      res.json({
        message: "Attendance validated successfully",
        registration: updatedRegistration
      });
    } catch (error) {
      console.error("Error validating QR code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate attendance via manual ID
  app.post("/api/registrations/validate-manual", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { uniqueId } = req.body;
      
      if (!uniqueId) {
        return res.status(400).json({ message: "Unique ID is required" });
      }

      const registration = await RegistrationService.getRegistrationByUniqueId(uniqueId);
      
      if (!registration || !registration.id) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Update attendance
      const updatedRegistration = await RegistrationService.validateAttendance(
        registration.id,
        "manual_id"
      );

      res.json({
        message: "Attendance validated successfully",
        registration: updatedRegistration
      });
    } catch (error) {
      console.error("Error validating manual ID:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate registration card
  app.get("/api/registrations/:id/card", async (req: Request, res: Response) => {
    try {
      const card = await RegistrationService.generateRegistrationCard(req.params.id);
      res.json(card);
    } catch (error) {
      console.error("Error generating registration card:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test QR generation endpoint for debugging
  app.get("/api/registrations/test/qr", async (req: Request, res: Response) => {
    try {
      // Get first registration for testing
      const registrations = await RegistrationService.getEventRegistrations("", {});
      
      if (!registrations || registrations.length === 0) {
        return res.status(404).json({ message: "No registrations found for testing" });
      }

      const testRegistration = registrations[0];
      
      // Generate test QR code data - use uniqueId for consistency with validation
      const qrCodeData = JSON.stringify({
        registrationId: testRegistration.uniqueId, // Use uniqueId for consistency with validation lookup
        eventId: testRegistration.eventId,
        uniqueId: testRegistration.uniqueId,
        timestamp: Date.now()
      });
      
      console.log('🧪 Test QR Data:', qrCodeData);
      
      const QRCode = require('qrcode');
      const qrImageBase64 = await QRCode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.json({
        message: "Test QR code generated",
        qrData: qrCodeData,
        qrImage: qrImageBase64,
        registration: testRegistration
      });
    } catch (error) {
      console.error("Error generating test QR:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get registrations by event
  app.get("/api/events/:eventId/registrations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const filters = req.query;
      const registrations = await RegistrationService.getEventRegistrations(req.params.eventId, filters);
      
      res.json(registrations);
    } catch (error) {
      console.error("Error getting event registrations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk update registration statuses
  app.patch("/api/registrations/bulk-update", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { registrationIds, status } = req.body;
      
      if (!Array.isArray(registrationIds) || !status) {
        return res.status(400).json({ message: "Registration IDs array and status are required" });
      }

      const results = await Promise.all(
        registrationIds.map(id => RegistrationService.updateRegistrationStatus(id, status))
      );

      res.json({
        message: "Registrations updated successfully",
        updated: results.length
      });
    } catch (error) {
      console.error("Error bulk updating registrations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}