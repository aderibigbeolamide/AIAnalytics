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
      const banks = banksData.data || [];
      
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