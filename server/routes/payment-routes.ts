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

const bankVerificationSchema = z.object({
  accountNumber: z.string()
    .min(10, "Account number must be exactly 10 digits")
    .max(10, "Account number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
  bankCode: z.string().min(1, "Bank code is required")
});

// Helper function to redact account numbers for logging
function redactAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length !== 10) {
    return "[INVALID]";
  }
  return `****${accountNumber.slice(-4)}`;
}

// Helper function to redact request body for logging
function redactRequestBody(body: any): any {
  if (!body) return body;
  const redacted = { ...body };
  if (redacted.accountNumber) {
    redacted.accountNumber = redactAccountNumber(redacted.accountNumber);
  }
  return redacted;
}

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

      // Check payment timeout (20 minutes = 1200000 milliseconds)
      const PAYMENT_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
      
      if (registration.paymentCreatedAt) {
        const paymentAge = Date.now() - new Date(registration.paymentCreatedAt).getTime();
        
        if (paymentAge > PAYMENT_TIMEOUT_MS) {
          console.log(`Payment expired - Age: ${Math.floor(paymentAge / 1000 / 60)} minutes`);
          return res.status(400).json({
            status: 'failed',
            message: "Payment session expired. Please initialize a new payment.",
            error: 'PAYMENT_TIMEOUT',
            details: {
              paymentCreatedAt: registration.paymentCreatedAt,
              timeoutMinutes: 20,
              elapsedMinutes: Math.floor(paymentAge / 1000 / 60)
            }
          });
        }
        
        console.log(`Payment is within timeout - Age: ${Math.floor(paymentAge / 1000 / 60)} minutes`);
      } else {
        // Backwards compatibility: Allow verification if no paymentCreatedAt exists
        console.log('No paymentCreatedAt found - allowing verification for backwards compatibility');
      }

      // Update registration with payment info
      await mongoStorage.updateEventRegistration(metadata.registrationId, {
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentAmount: paystackResponse.data.amount / 100, // Convert from kobo to naira
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

      // Check payment timeout (20 minutes = 1200000 milliseconds)
      const PAYMENT_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
      
      if (registration.paymentCreatedAt) {
        const paymentAge = Date.now() - new Date(registration.paymentCreatedAt).getTime();
        
        if (paymentAge > PAYMENT_TIMEOUT_MS) {
          console.log(`Payment expired - Age: ${Math.floor(paymentAge / 1000 / 60)} minutes`);
          return res.status(400).json({
            success: false,
            message: "Payment session expired. Please initialize a new payment.",
            error: 'PAYMENT_TIMEOUT',
            details: {
              paymentCreatedAt: registration.paymentCreatedAt,
              timeoutMinutes: 20,
              elapsedMinutes: Math.floor(paymentAge / 1000 / 60)
            }
          });
        }
        
        console.log(`Payment is within timeout - Age: ${Math.floor(paymentAge / 1000 / 60)} minutes`);
      } else {
        // Backwards compatibility: Allow verification if no paymentCreatedAt exists
        console.log('No paymentCreatedAt found - allowing verification for backwards compatibility');
      }

      // Update registration with payment info
      await mongoStorage.updateEventRegistration(registrationId!, {
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentAmount: parseFloat(paymentData.amount),
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
          const eventData = registration ? await mongoStorage.getEvent(registration.eventId.toString()) : null;
          
          if (registration && eventData) {
            // Update registration
            await mongoStorage.updateEventRegistration(metadata.registrationId, {
              paymentStatus: 'paid',
              paymentReference: reference,
              paymentAmount: event.data.amount,
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

  // Verify ticket payment by reference (POST route)
  app.post("/api/payment/verify-ticket", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ 
          success: false,
          message: "Payment reference is required" 
        });
      }
      
      console.log(`Verifying ticket payment for reference: ${reference}`);
      
      // Import Paystack verification function
      const { verifyPaystackPayment } = await import('../paystack');
      
      // Actually verify with Paystack API
      const paystackResponse = await verifyPaystackPayment(reference);
      console.log(`Paystack verification response:`, JSON.stringify(paystackResponse, null, 2));
      
      // Check verification success
      const isVerificationSuccessful = (
        paystackResponse && 
        (
          (paystackResponse.status === true && paystackResponse.data?.status === 'success') ||
          (paystackResponse.data?.gateway_response === 'Successful' && paystackResponse.data?.amount > 0)
        )
      );

      if (!isVerificationSuccessful) {
        return res.status(400).json({ 
          success: false,
          message: "Payment verification failed",
          details: paystackResponse.message || "Payment was not successful"
        });
      }
      
      // Get ticket details from metadata
      const metadata = paystackResponse.data.metadata;
      console.log(`Ticket payment metadata:`, JSON.stringify(metadata, null, 2));
      
      if (!metadata || !metadata.ticketId) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment metadata"
        });
      }
      
      // Get ticket
      const ticket = await mongoStorage.getTicketById(metadata.ticketId);
      
      if (!ticket) {
        return res.status(404).json({ 
          success: false,
          message: "Ticket not found" 
        });
      }

      // Check payment timeout (20 minutes = 1200000 milliseconds)
      const PAYMENT_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
      
      if (ticket.paymentCreatedAt) {
        const paymentAge = Date.now() - new Date(ticket.paymentCreatedAt).getTime();
        
        if (paymentAge > PAYMENT_TIMEOUT_MS) {
          console.log(`Ticket payment expired - Age: ${Math.floor(paymentAge / 1000 / 60)} minutes`);
          return res.status(400).json({
            success: false,
            message: "Payment session expired. Please initialize a new payment.",
            error: 'PAYMENT_TIMEOUT',
            details: {
              paymentCreatedAt: ticket.paymentCreatedAt,
              timeoutMinutes: 20,
              elapsedMinutes: Math.floor(paymentAge / 1000 / 60)
            }
          });
        }
        
        console.log(`Ticket payment is within timeout - Age: ${Math.floor(paymentAge / 1000 / 60)} minutes`);
      } else {
        // Backwards compatibility: Allow verification if no paymentCreatedAt exists
        console.log('No paymentCreatedAt found on ticket - allowing verification for backwards compatibility');
      }

      // Update ticket with payment info
      await mongoStorage.updateTicket(metadata.ticketId, {
        paymentStatus: 'paid',
        paymentReference: reference,
        status: 'paid'
      });

      // Get event details for notification
      const event = await mongoStorage.getEventById(ticket.eventId.toString());
      
      // Generate QR code for the ticket if not already present
      let qrCodeImage = (ticket as any).qrCodeImage;
      if (!qrCodeImage) {
        const QRCode = await import('qrcode');
        const qrCodeData = JSON.stringify({
          ticketId: (ticket as any)._id?.toString() || metadata.ticketId,
          ticketNumber: ticket.ticketNumber,
          eventId: ticket.eventId.toString(),
          timestamp: Date.now()
        });
        qrCodeImage = await QRCode.toDataURL(qrCodeData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Update ticket with QR code
        await mongoStorage.updateTicket(metadata.ticketId, {
          qrCodeImage: qrCodeImage
        });
      }
      
      if (event) {
        // Send payment notification to organization admin
        const { NotificationService } = await import('../notification-service');
        await NotificationService.createPaymentNotification(
          (event as any).organizationId?.toString() || '',
          (event as any)._id?.toString() || ticket.eventId.toString(),
          paystackResponse.data.amount / 100,
          paystackResponse.data.currency,
          ticket.ownerName,
          'ticket_purchase'
        );
        
        // Send ticket confirmation email to the purchaser with QR code
        try {
          const { EmailService } = await import('../services/email-service');
          const emailService = new EmailService();
          
          await emailService.sendRegistrationConfirmationEmail(ticket.ownerEmail, {
            participantName: ticket.ownerName || 'Ticket Holder',
            eventName: event.name,
            eventDate: event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD',
            eventTime: event.startDate ? new Date(event.startDate).toLocaleTimeString() : 'TBD',
            eventLocation: event.location || 'TBD',
            registrationId: ticket.ticketNumber,
            qrCode: qrCodeImage,
            eventUrl: `${process.env.APP_DOMAIN || 'http://localhost:5000'}/event-view/${ticket.eventId.toString()}`
          });
          
          console.log(`Ticket confirmation email sent to ${ticket.ownerEmail}`);
        } catch (emailError) {
          console.error('Failed to send ticket confirmation email:', emailError);
        }
      }

      res.json({
        success: true,
        message: "Ticket payment verified successfully",
        data: {
          payment: {
            reference,
            amount: (paystackResponse.data.amount / 100).toString(),
            currency: paystackResponse.data.currency,
            verifiedAt: new Date()
          },
          ticket: {
            ...ticket.toObject ? ticket.toObject() : ticket,
            qrCodeImage: qrCodeImage
          },
          event
        }
      });
    } catch (error: any) {
      console.error("Error verifying ticket payment:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Simple test route to verify payment routes are working
  app.get("/api/test-payment-routes", (req: Request, res: Response) => {
    console.log("=== PAYMENT ROUTES TEST ENDPOINT HIT ===");
    res.json({ status: "payment routes working", timestamp: new Date().toISOString() });
  });

  // Manual bank account verification - user selects bank, we verify account name
  app.post("/api/banks/verify-account", async (req: Request, res: Response) => {
    console.log("=== MANUAL BANK VERIFICATION ENDPOINT HIT ===");
    console.log("Request body:", JSON.stringify(redactRequestBody(req.body)));
    
    try {
      // Validate request body with Zod
      const validation = bankVerificationSchema.safeParse(req.body);
      if (!validation.success) {
        console.log("Invalid request data:", validation.error.errors);
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        });
      }

      const { accountNumber, bankCode } = validation.data;
      console.log(`Manual verification - Account: ${redactAccountNumber(accountNumber)}, Bank: ${bankCode}`);

      console.log(`Manual bank verification for account ${redactAccountNumber(accountNumber)} with bank code ${bankCode}`);
      
      // Import the bank functions
      const { verifyBankAccount, getNigerianBanks } = await import('../paystack');
      
      // Get list of banks to find the bank name
      const banksData = await getNigerianBanks();
      const banks = banksData.data || [];
      const selectedBank = banks.find(bank => bank.code === bankCode);
      
      if (!selectedBank) {
        console.log(`Invalid bank code provided: ${bankCode}`);
        return res.status(400).json({
          success: false,
          message: "Invalid bank selected. Please choose a valid bank from the list."
        });
      }

      // Verify account with the selected bank only
      console.log(`Verifying with ${selectedBank.name} (${selectedBank.code})`);
      const verificationData = await verifyBankAccount(accountNumber, selectedBank.code);
      
      if (verificationData.status && verificationData.data?.account_name) {
        console.log(`Manual verification successful: ${selectedBank.name} - Account: ${redactAccountNumber(accountNumber)} - Name: ${verificationData.data.account_name}`);
        return res.json({
          success: true,
          accountName: verificationData.data.account_name,
          accountNumber: verificationData.data.account_number || accountNumber,
          bankName: selectedBank.name,
          bankCode: selectedBank.code
        });
      } else {
        console.log(`Manual verification failed for account ${redactAccountNumber(accountNumber)}: ${verificationData.message || 'Unknown error'}`);
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Could not verify account with the selected bank. Please check your account number and bank selection."
        });
      }

    } catch (error) {
      console.error("Manual bank verification error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Bank verification service is temporarily unavailable. Please try again in a few minutes." 
      });
    }
  });

  // Get list of Nigerian banks for dropdown selection
  app.get("/api/banks/list", async (req: Request, res: Response) => {
    console.log("=== GET BANKS LIST ENDPOINT HIT ===");
    
    try {
      // Import the bank functions
      const { getNigerianBanks } = await import('../paystack');
      
      // Get list of Nigerian banks
      const banksData = await getNigerianBanks();
      const rawBanks = banksData.data || [];
      
      // Remove duplicates from raw data first (some banks have same code in Paystack API)
      // Keep the first occurrence and log duplicates for debugging
      const uniqueRawBanks = rawBanks.reduce((acc: any[], bank: any) => {
        const existingBank = acc.find(existingBank => existingBank.code === bank.code);
        if (!existingBank) {
          acc.push(bank);
        } else {
          console.log(`Skipping duplicate bank code ${bank.code}: ${bank.name} (keeping ${existingBank.name})`);
        }
        return acc;
      }, []);
      
      const banks = uniqueRawBanks;
      
      // Sort banks alphabetically and prioritize major banks
      const majorBanks = [
        { code: '044', name: 'Access Bank' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '214', name: 'First City Monument Bank' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '058', name: 'Guaranty Trust Bank' },
        { code: '082', name: 'Keystone Bank' },
        { code: '221', name: 'Stanbic IBTC Bank' },
        { code: '068', name: 'Standard Chartered Bank' },
        { code: '232', name: 'Sterling Bank' },
        { code: '033', name: 'United Bank for Africa' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '215', name: 'Unity Bank' },
        { code: '035', name: 'Wema Bank' },
        { code: '057', name: 'Zenith Bank' },
        { code: '050', name: 'Ecobank Nigeria' }
      ];
      
      // Get other banks (exclude major ones from the full list)
      const otherBanks = banks
        .filter((bank: any) => !majorBanks.some((major: any) => major.code === bank.code))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      // Combine with major banks first, then others
      const sortedBanks = [...majorBanks, ...otherBanks];
      
      console.log(`Returning ${sortedBanks.length} banks for selection`);
      return res.json({
        success: true,
        banks: sortedBanks
      });

    } catch (error) {
      console.error("Get banks list error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Unable to load banks list. Please try again." 
      });
    }
  });

  // Get Nigerian banks list endpoint - alias for /api/banks
  app.get("/api/banks/list", async (req: Request, res: Response) => {
    console.log("=== BANKS LIST ENDPOINT HIT ===");
    
    try {
      const { getNigerianBanks } = await import('../paystack');
      const banksData = await getNigerianBanks();
      
      if (banksData.status) {
        const banks = banksData.data;
        
        console.log(`Successfully loaded ${banks.length} banks from Paystack API`);
        
        res.json({
          success: true,
          banks: banks,
          message: `Found ${banks.length} Nigerian banks`
        });
      } else {
        console.log("Failed to fetch banks from Paystack API");
        res.status(400).json({
          success: false,
          message: "Failed to fetch banks from Paystack API"
        });
      }
    } catch (error) {
      console.error("Get banks list error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Unable to load banks list. Please try again." 
      });
    }
  });
}