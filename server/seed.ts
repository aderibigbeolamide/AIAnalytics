// // server/seed.ts
// import { db } from './db.js';
// import { users } from '../shared/schema.js';
// import { hashPassword } from './auth.js';

// export async function seed() {
//   console.log('🔄 Checking for existing seed data...');

//   try {
//     const existingAdmin = await db.query.users.findFirst({
//       where: (users, { eq }) => eq(users.username, 'admin')
//     });

//     if (existingAdmin) {
//       console.log('✅ Admin user already exists');
//       return;
//     }

//     const hashedPassword = await hashPassword('password123');
//     await db.insert(users).values({
//       username: 'admin',
//       password: hashedPassword,
//       role: 'admin'
//     });

//     console.log('✅ Admin user created');
//     console.log('🔐 Username: admin');
//     console.log('🔐 Password: password123 (change after first login)');
//   } catch (error) {
//     console.error('❌ Error during seeding:', error);
//   }
// }
