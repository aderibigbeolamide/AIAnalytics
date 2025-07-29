import bcrypt from "bcrypt";
import { User, Organization } from "@shared/mongoose-schema";

export async function mongoAutoSeed() {
  console.log("🌱 Auto-seeding: Checking if database needs seeding...");
  
  try {
    // Check if super admin user exists
    console.log("🔍 Checking for existing super admin user...");
    const existingSuperAdmin = await User.findOne({ username: "superadmin" });
    
    if (!existingSuperAdmin) {
      console.log("📝 Creating super admin user...");
      const hashedPassword = await bcrypt.hash("superadmin2025!", 10);
      
      await User.create({
        username: "superadmin",
        email: "superadmin@eventvalidate.com",
        password: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        status: "active",
        emailVerified: true,
        twoFactorEnabled: false
      });
      
      console.log("✅ Super admin user created successfully");
    } else {
      console.log("✓ Super admin user already exists");
    }
    
    // Check if default organization exists
    console.log("🔍 Checking for default organization...");
    let defaultOrg = await Organization.findOne({ name: "Default Organization" });
    
    if (!defaultOrg) {
      console.log("📝 Creating default organization...");
      defaultOrg = await Organization.create({
        name: "Default Organization",
        contactEmail: "admin@eventvalidate.com",
        status: "approved",
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        maxEvents: 100,
        maxMembers: 1000,
        createdAt: new Date(),
        approvedAt: new Date()
      });
      console.log("✅ Default organization created successfully");
    } else {
      console.log("✓ Default organization already exists");
    }

    // Check if admin user exists
    console.log("🔍 Checking for existing admin user...");
    const existingAdmin = await User.findOne({ username: "admin" });
    
    if (!existingAdmin) {
      console.log("📝 Creating admin user...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      
      await User.create({
        username: "admin",
        email: "admin@eventvalidate.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        status: "active",
        emailVerified: true,
        twoFactorEnabled: false,
        organizationId: defaultOrg._id
      });
      
      console.log("✅ Admin user created successfully");
    } else {
      console.log("✓ Admin user already exists");
      
      // Update admin user with organization if not set
      if (!existingAdmin.organizationId) {
        console.log("📝 Updating admin user with organization...");
        await User.findByIdAndUpdate(existingAdmin._id, {
          organizationId: defaultOrg._id
        });
        console.log("✅ Admin user updated with organization");
      }
    }
    
    console.log("✓ Database seeding completed successfully");
  } catch (error) {
    console.error("⚠️ Auto-seeding failed:", error);
    console.log("💡 You can manually run: npm run seed");
  }
}