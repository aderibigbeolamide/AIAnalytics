import { db, pool } from '../server/db.js';
import { users } from '../shared/schema.js';
import { hashPassword } from '../server/auth.js';

async function seed() {
  console.log('Setting up default users...');
  
  // Set a timeout for the entire seeding process
  const timeout = setTimeout(() => {
    console.error('❌ Seeding process timed out after 30 seconds');
    console.log('This might be due to database connection issues.');
    console.log('Please check your DATABASE_URL and network connection.');
    process.exit(1);
  }, 30000);
  
  try {
    console.log('🔍 Checking database connection...');
    
    // Test database connection first
    await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check if super admin user already exists
    console.log('🔍 Checking for existing super admin user...');
    const existingSuperAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'superadmin')
    });
    
    if (!existingSuperAdmin) {
      console.log('📝 Creating super admin user...');
      // Create super admin user
      const hashedPassword = await hashPassword('superadmin2025!');
      await db.insert(users).values({
        username: 'superadmin',
        email: 'superadmin@eventvalidate.com',
        password: hashedPassword,
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
        status: 'active'
      });
      
      console.log('✅ Super admin user created successfully');
      console.log('Username: superadmin');
      console.log('Password: superadmin2025!');
    } else {
      console.log('ℹ️ Super admin user already exists');
    }

    // Check if admin user already exists
    console.log('🔍 Checking for existing admin user...');
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });
    
    if (!existingAdmin) {
      console.log('📝 Creating admin user...');
      // Create admin user
      const hashedPassword = await hashPassword('password123');
      await db.insert(users).values({
        username: 'admin',
        email: 'admin@eventvalidate.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        status: 'active'
      });
      
      console.log('✅ Admin user created successfully');
      console.log('Username: admin');
      console.log('Password: password123');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    console.log('🔐 Please change the passwords after first login');
    console.log('🎉 Seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if your DATABASE_URL is correct');
    console.log('2. Ensure your database is running and accessible');
    console.log('3. Verify your database schema has been pushed: npm run db:push');
    console.log('4. Check your network connection');
  } finally {
    clearTimeout(timeout);
    
    // Close database connection pool
    try {
      await pool.end();
      console.log('🔌 Database connection closed');
    } catch (error) {
      // Ignore connection close errors
    }
  }
  
  process.exit(0);
}

seed();