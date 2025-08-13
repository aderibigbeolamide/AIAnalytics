import type { Express, Request, Response } from "express";
import { authenticateToken, type AuthenticatedRequest } from "./auth-routes";
import { notificationService } from "../services/notification-service";
import { mongoStorage } from "../mongodb-storage";
import { z } from "zod";

const paymentVerifySchema = z.object({
  reference: z.string(),
  registrationId: z.string().optional(),
  eventId: z.string().optional(),
});

export function registerPaymentRoutes(app: Express) {
  // Verify payment and send confirmation
  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    try {
      const { reference, registrationId, eventId } = paymentVerifySchema.parse(req.body);
      
      // Here you would typically verify with Paystack API
      // For now, we'll simulate a successful payment
      const paymentData = {
        reference,
        status: 'success',
        amount: '5000', // This would come from Paystack
        currency: 'NGN',
        verifiedAt: new Date()
      };

      // Get registration and event details
      let registration = null;
      let event = null;

      if (registrationId) {
        registration = await mongoStorage.getEventRegistration(registrationId);
        if (registration) {
          event = await mongoStorage.getEvent(registration.eventId.toString());
        }
      } else if (eventId) {
        event = await mongoStorage.getEvent(eventId);
      }

      if (!registration || !event) {
        return res.status(404).json({ message: "Registration or event not found" });
      }

      // Update registration with payment info
      await mongoStorage.updateEventRegistration(registrationId!, {
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentAmount: paymentData.amount,
        paymentCurrency: paymentData.currency,
        paymentVerifiedAt: paymentData.verifiedAt
      });

      // Send payment success notification
      await notificationService.notifyPaymentSuccess({
        registration,
        event,
        payment: paymentData
      });

      res.json({
        message: "Payment verified successfully",
        payment: paymentData
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payment webhook (for Paystack callbacks)
  app.post("/api/payment/webhook", async (req: Request, res: Response) => {
    try {
      // Verify webhook signature here
      const event = req.body;
      
      if (event.event === 'charge.success') {
        const { reference, metadata } = event.data;
        
        if (metadata && metadata.registrationId) {
          const registration = await mongoStorage.getEventRegistration(metadata.registrationId);
          const eventData = await mongoStorage.getEvent(registration?.eventId.toString());
          
          if (registration && eventData) {
            // Update registration
            await mongoStorage.updateEventRegistration(metadata.registrationId, {
              paymentStatus: 'paid',
              paymentReference: reference,
              paymentAmount: event.data.amount,
              paymentCurrency: event.data.currency,
              paymentVerifiedAt: new Date()
            });

            // Send payment success notification
            await notificationService.notifyPaymentSuccess({
              registration,
              event: eventData,
              payment: {
                reference,
                amount: event.data.amount,
                currency: event.data.currency
              }
            });
          }
        }
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });
}