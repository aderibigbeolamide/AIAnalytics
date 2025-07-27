import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seed() {
  console.log('🔄 Checking for existing seed data...');

  try {
    // Seed super admin (system-wide administrator)
    const existingSuperAdmin = await storage.getUserByUsername('superadmin');

    if (!existingSuperAdmin) {
      const hashedPassword = await hashPassword('superadmin2025!');
      await storage.createUser({
        username: 'superadmin',
        email: 'superadmin@eventvalidate.com',
        password: hashedPassword,
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
        status: 'active'
      });
      console.log('✅ Super admin user created');
      console.log('🔐 Username: superadmin');
      console.log('🔐 Password: superadmin2025!');
    } else {
      console.log('✅ Super admin user already exists');
    }

    // Remove organization admin seeding - they register through the landing page
    console.log('✅ Database seeding completed');
    console.log('📝 Note: Organizations can now register through the landing page');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}
