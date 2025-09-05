import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Setting up default users in PostgreSQL...");
  
  try {
    if (!db) {
      console.log("⚠️ PostgreSQL database not configured - skipping seeding");
      return;
    }

    console.log("✅ PostgreSQL database connection successful");
    
    // Check for existing super admin user
    console.log("🔍 Checking for existing super admin user...");
    const existingSuperAdmin = await db.select().from(users).where(eq(users.username, "superadmin")).limit(1);
    
    if (existingSuperAdmin.length === 0) {
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
        twoFactorEnabled: false
      });
      
      console.log("✅ Super admin user created successfully");
      console.log("Username: superadmin");
      console.log("Password: superadmin2025!");
    } else {
      console.log("✓ Super admin user already exists");
    }
    
    // Check for existing admin user
    console.log("🔍 Checking for existing admin user...");
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
    
    if (existingAdmin.length === 0) {
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
        twoFactorEnabled: false
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
    console.error("❌ Error seeding PostgreSQL database:", error);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check if your DATABASE_URL is correct");
    console.log("2. Ensure your PostgreSQL database is running and accessible");
    console.log("3. Check your network connection");
  } finally {
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

seed();