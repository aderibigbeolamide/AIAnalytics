import bcrypt from "bcrypt";
import { User } from "@shared/mongoose-schema";

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
        twoFactorEnabled: false
      });
      
      console.log("✅ Admin user created successfully");
    } else {
      console.log("✓ Admin user already exists");
    }
    
    console.log("✓ Database already contains users, skipping auto-seed");
  } catch (error) {
    console.error("⚠️ Auto-seeding failed:", error);
    console.log("💡 You can manually run: npm run seed");
  }
}