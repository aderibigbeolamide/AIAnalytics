import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { hashPassword } from '../server/auth.js';

async function seed() {
  console.log('Setting up default users...');
  
  try {
    // Check if super admin user already exists
    const existingSuperAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'superadmin')
    });
    
    if (!existingSuperAdmin) {
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
      
      console.log('Super admin user created successfully');
      console.log('Username: superadmin');
      console.log('Password: superadmin2025!');
    } else {
      console.log('Super admin user already exists');
    }

    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });
    
    if (!existingAdmin) {
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
      
      console.log('Admin user created successfully');
      console.log('Username: admin');
      console.log('Password: password123');
    } else {
      console.log('Admin user already exists');
    }
    
    console.log('Please change the passwords after first login');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  }
  
  process.exit(0);
}

seed();