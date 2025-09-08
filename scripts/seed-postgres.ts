import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users, organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Setting up default users for PostgreSQL...");
  
  try {
    if (!db) {
      console.error("❌ Database connection not available");
      process.exit(1);
    }

    console.log("✅ Database connection successful");
    
    // Create default organization first
    console.log("🔍 Checking for default organization...");
    const existingOrgs = await db.select().from(organizations).where(eq(organizations.name, "Default Organization"));
    
    let defaultOrg;
    if (existingOrgs.length === 0) {
      console.log("📝 Creating default organization...");
      const [newOrg] = await db.insert(organizations).values({
        name: "Default Organization",
        contactEmail: "admin@eventvalidate.com",
        status: "approved",
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        maxEvents: 100,
        maxMembers: 1000,
        approvedAt: new Date(),
      }).returning();
      defaultOrg = newOrg;
      console.log("✅ Default organization created successfully");
    } else {
      defaultOrg = existingOrgs[0];
      console.log("✓ Default organization already exists");
    }
    
    // Check for existing super admin user
    console.log("🔍 Checking for existing super admin user...");
    const existingSuperAdmins = await db.select().from(users).where(eq(users.username, "superadmin"));
    
    if (existingSuperAdmins.length === 0) {
      console.log("📝 Creating super admin user...");
      const hashedPassword = await bcrypt.hash("superadmin2025!", 10);
      
      await db.insert(users).values({
        username: "superadmin",
        email: "superadmin@eventvalidate.com",
        password: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        status: "active",
        emailVerified: true,
        twoFactorEnabled: false,
        organizationId: defaultOrg.id
      });
      
      console.log("✅ Super admin user created successfully");
      console.log("Username: superadmin");
      console.log("Password: superadmin2025!");
    } else {
      console.log("✓ Super admin user already exists");
    }
    
    // Check for existing admin user
    console.log("🔍 Checking for existing admin user...");
    const existingAdmins = await db.select().from(users).where(eq(users.username, "admin"));
    
    if (existingAdmins.length === 0) {
      console.log("📝 Creating admin user...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      
      await db.insert(users).values({
        username: "admin",
        email: "admin@eventvalidate.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        status: "active",
        emailVerified: true,
        twoFactorEnabled: false,
        organizationId: defaultOrg.id
      });
      
      console.log("✅ Admin user created successfully");
      console.log("Username: admin");
      console.log("Password: password123");
    } else {
      console.log("✓ Admin user already exists");
    }
    
    console.log("🔐 Please change the passwords after first login");
    console.log("🎉 PostgreSQL seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check if your DATABASE_URL is correct");
    console.log("2. Ensure your PostgreSQL database is running and accessible");
    console.log("3. Check your network connection");
    process.exit(1);
  }
}

seed();