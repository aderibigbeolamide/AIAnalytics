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
  // Verify payment by reference (GET route for callback)
  app.get("/api/payment/verify/:reference", async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      console.log(`Verifying payment for reference: ${reference}`);
      
      // Import Paystack verification function
      const { verifyPaystackPayment } = await import('../paystack');
      
      // Actually verify with Paystack API
      const paystackResponse = await verifyPaystackPayment(reference);
      console.log(`Paystack verification response:`, JSON.stringify(paystackResponse, null, 2));
      
      // More robust verification check - handle different status formats
      const isVerificationSuccessful = (
        paystackResponse && 
        (
          // Standard Paystack response format
          (paystackResponse.status === true && paystackResponse.data?.status === 'success') ||
          // Alternative status formats
          (paystackResponse.status === 'success') ||
          (paystackResponse.success === true && paystackResponse.data?.status === 'success') ||
          // Check if payment was actually successful based on amount and gateway response
          (paystackResponse.data?.gateway_response === 'Successful' && paystackResponse.data?.amount > 0)
        )
      );

      console.log('Payment verification successful?', isVerificationSuccessful);
      console.log('Paystack response status:', paystackResponse?.status);
      console.log('Paystack data status:', paystackResponse?.data?.status);
      console.log('Gateway response:', paystackResponse?.data?.gateway_response);
      
      if (!isVerificationSuccessful) {
        return res.status(400).json({ 
          status: 'failed',
          message: "Payment verification failed",
          details: paystackResponse.message || "Payment was not successful"
        });
      }
      
      // Get registration details from metadata
      const metadata = paystackResponse.data.metadata;
      console.log(`Payment metadata:`, JSON.stringify(metadata, null, 2));
      
      let registration = null;
      let event = null;
      
      // First try to get registration directly
      if (metadata && metadata.registrationId) {
        console.log(`Looking up registration with ID: ${metadata.registrationId}`);
        try {
          registration = await mongoStorage.getEventRegistration(metadata.registrationId);
          console.log(`Registration found:`, registration ? 'Yes' : 'No');
          
          if (registration) {
            console.log(`Registration eventId:`, registration.eventId);
            console.log(`Looking up event with ID: ${registration.eventId}`);
            
            // Try to find the event using the eventId from registration
            try {
              event = await mongoStorage.getEvent(registration.eventId);
              console.log(`Event found:`, event ? 'Yes' : 'No');
            } catch (eventError) {
              console.error(`Error finding event with registration.eventId:`, eventError);
              
              // Try to extract event ID from the stringified metadata as backup
              if (metadata.eventId) {
                const eventIdMatch = metadata.eventId.match(/new ObjectId\('([^']+)'\)/);
                if (eventIdMatch) {
                  const actualEventId = eventIdMatch[1];
                  console.log(`Trying extracted eventId: ${actualEventId}`);
                  event = await mongoStorage.getEvent(actualEventId);
                  console.log(`Event found with extracted ID:`, event ? 'Yes' : 'No');
                }
              }
            }
          }
        } catch (registrationError) {
          console.error(`Error finding registration:`, registrationError);
        }
      }
      
      // If still no registration or event, try to extract eventId from the stringified object in metadata
      if ((!registration || !event) && metadata && metadata.eventId) {
        console.log(`Trying to extract eventId from stringified object...`);
        // Extract the actual ObjectId from the stringified event object
        const eventIdMatch = metadata.eventId.match(/new ObjectId\('([^']+)'\)/);
        if (eventIdMatch) {
          const actualEventId = eventIdMatch[1];
          console.log(`Extracted eventId: ${actualEventId}`);
          event = await mongoStorage.getEvent(actualEventId);
          console.log(`Event found with extracted ID:`, event ? 'Yes' : 'No');
          
          // If we have an event, try to find the registration by registrationId
          if (event && metadata.registrationId) {
            registration = await mongoStorage.getEventRegistration(metadata.registrationId);
            console.log(`Registration found with event context:`, registration ? 'Yes' : 'No');
          }
        }
      }
      
      if (!registration || !event) {
        console.log(`Missing - Registration: ${registration ? 'Found' : 'Missing'}, Event: ${event ? 'Found' : 'Missing'}`);
        return res.status(404).json({ 
          status: 'failed',
          message: "Registration or event not found" 
        });
      }

      // Update registration with payment info
      await mongoStorage.updateEventRegistration(metadata.registrationId, {
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentAmount: (paystackResponse.data.amount / 100).toString(), // Convert from kobo to naira
        paymentCurrency: paystackResponse.data.currency,
        paymentVerifiedAt: new Date()
      });

      // Send payment success notification
      await notificationService.notifyPaymentSuccess({
        registration,
        event,
        payment: {
          reference,
          amount: (paystackResponse.data.amount / 100).toString(),
          currency: paystackResponse.data.currency
        }
      });

      res.json({
        status: 'success',
        message: "Payment verified successfully",
        data: {
          payment: {
            reference,
            amount: (paystackResponse.data.amount / 100).toString(),
            currency: paystackResponse.data.currency,
            verifiedAt: new Date()
          },
          registration,
          event
        }
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ 
        status: 'failed',
        message: "Internal server error" 
      });
    }
  });

  // Verify payment and send confirmation (POST route for manual verification)
  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    try {
      const { reference, registrationId, eventId } = paymentVerifySchema.parse(req.body);
      
      // Import Paystack verification function
      const { verifyPaystackPayment } = await import('../paystack');
      
      // Actually verify with Paystack API
      const paystackResponse = await verifyPaystackPayment(reference);
      
      if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
        return res.status(400).json({ 
          message: "Payment verification failed",
          details: paystackResponse.message || "Payment was not successful"
        });
      }
      
      const paymentData = {
        reference,
        status: 'success',
        amount: (paystackResponse.data.amount / 100).toString(), // Convert from kobo to naira
        currency: paystackResponse.data.currency,
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