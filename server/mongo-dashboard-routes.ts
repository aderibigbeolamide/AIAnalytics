import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { fileStorage } from "./storage-handler";

export function registerMongoDashboardRoutes(app: Express) {
  // Dashboard statistics
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      // Get all data for the organization
      const events = await mongoStorage.getEvents(organizationId ? { organizationId } : {});
      const members = await mongoStorage.getMembers(organizationId ? { organizationId } : {});
      const registrations = await mongoStorage.getEventRegistrations();
      
      // Calculate statistics
      const totalEvents = events.length;
      const totalMembers = members.length;
      const totalRegistrations = registrations.length;
      const totalScans = registrations.filter(r => r.attendanceStatus === 'attended').length;
      const validationRate = totalRegistrations > 0 ? Math.round((totalScans / totalRegistrations) * 100) : 100;
      
      // Recent activity (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentEvents = events.filter(e => e.createdAt >= oneWeekAgo).length;
      const recentRegistrations = registrations.filter(r => r.createdAt >= oneWeekAgo).length;
      
      const stats = {
        totalEvents: totalEvents.toString(),
        totalMembers: totalMembers.toString(),
        totalRegistrations: totalRegistrations.toString(),
        totalScans: totalScans.toString(),
        validationRate,
        recentActivity: {
          newEvents: recentEvents,
          newRegistrations: recentRegistrations
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get events for dashboard
  app.get("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      const events = await mongoStorage.getEvents(organizationId ? { organizationId } : {});
      
      const formattedEvents = events.map(event => ({
        id: event._id.toString(),
        name: event.name,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        registrationStartDate: event.registrationStartDate,
        registrationEndDate: event.registrationEndDate,
        status: event.status,
        maxAttendees: event.maxAttendees,
        eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
        allowGuests: event.allowGuests,
        allowInvitees: event.allowInvitees,
        requirePayment: event.requirePayment,
        paymentAmount: event.paymentAmount,
        paymentCurrency: event.paymentCurrency,
        eventType: event.eventType,
        createdAt: event.createdAt,
        organizationId: event.organizationId?.toString(),
        createdBy: event.createdBy?.toString()
      }));

      res.json(formattedEvents);
    } catch (error) {
      console.error("Error getting events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get members for dashboard
  app.get("/api/members", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      const members = await mongoStorage.getMembers(organizationId ? { organizationId } : {});
      
      const formattedMembers = members.map(member => ({
        id: member._id.toString(),
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        auxiliaryBody: member.auxiliaryBody,
        membershipId: member.membershipId,
        status: member.status,
        createdAt: member.createdAt,
        organizationId: member.organizationId?.toString()
      }));

      res.json(formattedMembers);
    } catch (error) {
      console.error("Error getting members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get auxiliary bodies (public endpoint)
  app.get("/api/auxiliary-bodies", async (req: Request, res: Response) => {
    try {
      // Return default auxiliary bodies for now
      const auxiliaryBodies = [
        "Atfal",
        "Khuddam",
        "Lajna", 
        "Ansarullah",
        "Nasra"
      ];

      res.json(auxiliaryBodies);
    } catch (error) {
      console.error("Error getting auxiliary bodies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user preferences  
  app.get("/api/users/preferences/public", async (req: Request, res: Response) => {
    try {
      // Return default preferences
      const preferences = {
        auxiliaryBodies: ["Atfal", "Khuddam", "Lajna", "Ansarullah", "Nasra"],
        jamaats: ["Central", "Regional", "Local"],
        circuits: ["A", "B", "C", "D"]
      };

      res.json({ preferences });
    } catch (error) {
      console.error("Error getting user preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get recommendations
  app.get("/api/recommendations/public", async (req: Request, res: Response) => {
    try {
      // Return empty recommendations for now
      res.json([]);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Configure multer for profile image uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Get organization profile
  app.get("/api/organization/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await mongoStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return organization profile data
      const profile = {
        businessName: user.businessName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        description: user.description || "",
        website: user.website || "",
        profileImage: user.profileImage || null,
      };

      res.json(profile);
    } catch (error) {
      console.error("Error getting organization profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update organization profile
  app.put("/api/organization/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { businessName, email, phone, address, description, website } = req.body;

      // Update user profile
      await mongoStorage.updateUser(userId, {
        businessName,
        email,
        phone,
        address,
        description,
        website,
      });

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating organization profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update organization password
  app.put("/api/organization/password", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      // Get current user
      const user = await mongoStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await mongoStorage.updateUser(userId, {
        password: hashedPassword,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload organization profile image
  app.post("/api/organization/profile-image", authenticateToken, upload.single('profileImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const filename = `profile_${userId}_${timestamp}${ext}`;

      // Save file using fileStorage
      const filePath = await fileStorage.saveFile(req.file.buffer, filename, 'profile-images');

      // Update user profile with image path
      await mongoStorage.updateUser(userId, {
        profileImage: filePath,
      });

      res.json({ 
        message: "Profile image updated successfully",
        imageUrl: filePath 
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get Nigerian banks list - Essential for bank account setup
  app.get("/api/banks", async (req: Request, res: Response) => {
    try {
      // Get banks from Paystack API
      const { getNigerianBanks } = await import("./paystack");
      const banksData = await getNigerianBanks();
      
      if (banksData.status) {
        const banks = banksData.data;
        
        // Additional categorization and statistics
        const commercialBanks = banks.filter((bank: any) => bank.type === 'commercial');
        const microfinanceBanks = banks.filter((bank: any) => bank.type === 'microfinance');
        
        res.json({
          success: true,
          banks: banks,
          statistics: {
            total: banks.length,
            commercial: commercialBanks.length,
            microfinance: microfinanceBanks.length
          },
          message: `Found ${banks.length} banks (${commercialBanks.length} commercial, ${microfinanceBanks.length} microfinance)`
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to fetch banks from Paystack API"
        });
      }
    } catch (error) {
      console.error("Get banks error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch banks. Please check your internet connection and try again." 
      });
    }
  });

  // Verify bank account details
  app.post("/api/banks/verify", async (req: Request, res: Response) => {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        return res.status(400).json({ 
          success: false,
          message: "Account number and bank code are required" 
        });
      }

      const { verifyBankAccount } = await import("./paystack");
      const verificationData = await verifyBankAccount(accountNumber, bankCode);

      if (verificationData.status) {
        res.json({
          success: true,
          accountName: verificationData.data.account_name,
          accountNumber: verificationData.data.account_number
        });
      } else {
        res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }
    } catch (error) {
      console.error("Bank verification error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to verify bank account" 
      });
    }
  });

  // Get user's bank account details (PRIVATE - only for account owner)
  app.get("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get the actual user data from MongoDB
      const user = await mongoStorage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Return the actual bank account data from user fields (PRIVATE INFO)
      const bankAccount = {
        paystackSubaccountCode: user.paystackSubaccountCode,
        bankName: user.bankName,
        accountNumber: user.accountNumber,
        accountName: user.accountName,
        bankCode: user.bankCode,
        businessName: user.businessName,
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        percentageCharge: user.percentageCharge || 0,
        isVerified: user.isVerified || false
      };

      res.json({
        success: true,
        bankAccount: bankAccount
      });
    } catch (error: any) {
      console.error("Get bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch bank account details" 
      });
    }
  });

  // Setup bank account for user (create Paystack subaccount)
  app.post("/api/users/setup-bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 2 
      } = req.body;

      // Verify the bank account first
      const { verifyBankAccount, createSubaccount } = await import("./paystack");
      const verificationData = await verifyBankAccount(accountNumber, bankCode);

      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }

      // Create Paystack subaccount
      const subaccountData = await createSubaccount({
        business_name: businessName,
        bank_code: bankCode,
        account_number: accountNumber,
        percentage_charge: percentageCharge,
        description: `Subaccount for ${businessName}`,
        primary_contact_email: businessEmail,
        primary_contact_name: businessName,
        primary_contact_phone: businessPhone,
        metadata: {
          user_id: userId
        }
      });

      if (!subaccountData.status) {
        return res.status(400).json({
          success: false,
          message: subaccountData.message || "Failed to create subaccount"
        });
      }

      // Update user with bank account details
      await mongoStorage.updateUser(userId, {
        paystackSubaccountCode: subaccountData.data.subaccount_code,
        bankName: subaccountData.data.bank?.name || 'Unknown Bank',
        accountNumber: accountNumber,
        accountName: verificationData.data.account_name,
        bankCode: bankCode,
        businessName: businessName,
        businessEmail: businessEmail,
        businessPhone: businessPhone,
        percentageCharge: percentageCharge,
        isVerified: true
      });

      res.json({
        success: true,
        message: "Bank account setup successfully",
        subaccountCode: subaccountData.data.subaccount_code,
        accountName: verificationData.data.account_name
      });
    } catch (error: any) {
      console.error("Setup bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to setup bank account" 
      });
    }
  });

  // Update bank account for user
  app.put("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 2 
      } = req.body;

      // Verify the bank account first
      const { verifyBankAccount } = await import("./paystack");
      const verificationData = await verifyBankAccount(accountNumber, bankCode);

      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }

      // Update user with new bank account details
      await mongoStorage.updateUser(userId, {
        bankName: verificationData.data.bank_name || 'Unknown Bank',
        accountNumber: accountNumber,
        accountName: verificationData.data.account_name,
        bankCode: bankCode,
        businessName: businessName,
        businessEmail: businessEmail,
        businessPhone: businessPhone,
        percentageCharge: percentageCharge,
        isVerified: true
      });

      res.json({
        success: true,
        message: "Bank account updated successfully",
        accountName: verificationData.data.account_name
      });
    } catch (error: any) {
      console.error("Update bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update bank account" 
      });
    }
  });
}