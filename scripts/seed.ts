import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { hashPassword } from '../server/auth.js';

async function seed() {
  console.log('Setting up default admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const hashedPassword = await hashPassword('password123');
    await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: password123');
    console.log('Please change the password after first login');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  }
  
  process.exit(0);
}

seed();