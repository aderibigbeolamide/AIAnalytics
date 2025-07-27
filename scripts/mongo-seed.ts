import bcrypt from "bcrypt";
import { connectToMongoDB, disconnectFromMongoDB } from "../server/mongodb";
import { User } from "@shared/mongoose-schema";

async function seed() {
  console.log("Setting up default users...");
  
  try {
    console.log("🔍 Checking database connection...");
    await connectToMongoDB();
    console.log("✅ Database connection successful");
    
    // Check for existing super admin user
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
      console.log("Username: superadmin");
      console.log("Password: superadmin2025!");
    } else {
      console.log("✓ Super admin user already exists");
    }
    
    // Check for existing admin user
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
      console.log("Username: admin");
      console.log("Password: password123");
    } else {
      console.log("✓ Admin user already exists");
    }
    
    console.log("🔐 Please change the passwords after first login");
    console.log("🎉 Seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check if your MONGODB_URI is correct");
    console.log("2. Ensure your database is running and accessible");
    console.log("3. Check your network connection");
  } finally {
    console.log("🔌 Database connection closed");
    await disconnectFromMongoDB();
    process.exit(0);
  }
}

seed();