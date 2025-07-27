import { db, pool } from './db.js';
import { users } from '../shared/schema.js';
import { hashPassword } from './auth.js';

let seedingCompleted = false;
let connectionAttempted = false;

export async function autoSeed() {
  // Skip if already completed in this session
  if (seedingCompleted) {
    return;
  }

  // Skip if we already tried and failed to avoid repeated attempts
  if (connectionAttempted) {
    return;
  }

  console.log('🌱 Auto-seeding: Checking if database needs seeding...');
  connectionAttempted = true;
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
  );

  try {
    // Test database connection with timeout
    await Promise.race([
      db.execute('SELECT 1 as test'),
      timeout
    ]);
    
    console.log('✅ Database connection successful');
    
    // Check if any users exist
    const existingUsers = await Promise.race([
      db.query.users.findMany({ limit: 1 }),
      timeout
    ]) as any[];
    
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout')) {
      console.log('⚠️ Database connection timed out. This is normal for external databases.');
      console.log('💡 To manually seed your database, run: npm run seed');
      console.log('🌐 Note: External databases (like Render) may have connection limits from local environments');
    } else if (errorMsg.includes('ECONNREFUSED')) {
      console.log('⚠️ Database connection refused. Database server might not be running.');
      console.log('💡 Check your DATABASE_URL and ensure the database is accessible');
    } else {
      console.log('⚠️ Auto-seeding failed:', errorMsg);
      console.log('💡 You can manually run: npm run seed');
    }
    
    // Mark as completed to prevent retry attempts
    seedingCompleted = true;
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