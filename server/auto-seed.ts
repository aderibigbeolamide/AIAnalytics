import { db, pool } from './db.js';
import { users } from '../shared/schema.js';
import { hashPassword } from './auth.js';

let seedingCompleted = false;

export async function autoSeed() {
  // Skip if already completed in this session
  if (seedingCompleted) {
    return;
  }

  console.log('🌱 Auto-seeding: Checking if database needs seeding...');
  
  try {
    // Test database connection first
    await db.execute('SELECT 1 as test');
    
    // Check if any users exist
    const existingUsers = await db.query.users.findMany({ limit: 1 });
    
    if (existingUsers.length === 0) {
      console.log('📝 No users found, running auto-seed...');
      
      // Create super admin user
      const superAdminPassword = await hashPassword('superadmin2025!');
      await db.insert(users).values({
        username: 'superadmin',
        email: 'superadmin@eventvalidate.com',
        password: superAdminPassword,
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
        status: 'active'
      });
      
      // Create admin user
      const adminPassword = await hashPassword('password123');
      await db.insert(users).values({
        username: 'admin',
        email: 'admin@eventvalidate.com',
        password: adminPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        status: 'active'
      });
      
      console.log('✅ Auto-seeding completed successfully!');
      console.log('🔑 Login credentials:');
      console.log('   Admin: admin / password123');
      console.log('   Super Admin: superadmin / superadmin2025!');
      console.log('🔐 Please change passwords after first login');
      
      seedingCompleted = true;
    } else {
      console.log('✓ Database already contains users, skipping auto-seed');
      seedingCompleted = true;
    }
    
  } catch (error) {
    console.log('⚠️ Auto-seeding failed, database might not be ready yet:', error instanceof Error ? error.message : error);
    // Don't throw error to prevent app startup failure
  }
}

// Graceful cleanup
process.on('SIGINT', async () => {
  try {
    await pool.end();
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await pool.end();
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(0);
});