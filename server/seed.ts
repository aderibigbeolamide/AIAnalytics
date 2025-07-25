import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seed() {
  console.log('🔄 Checking for existing seed data...');

  try {
    const existingAdmin = await storage.getUserByUsername('admin');

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    const hashedPassword = await hashPassword('password123');
    await storage.createUser({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      paystackSubaccountCode: null,
      bankName: null,
      accountNumber: null,
      accountName: null,
      bankCode: null,
      businessName: null,
      businessEmail: null,
      businessPhone: null,
      settlementBank: null,
      percentageCharge: 0,
      isVerified: false
    });

    console.log('✅ Admin user created');
    console.log('🔐 Username: admin');
    console.log('🔐 Password: password123 (change after first login)');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}
