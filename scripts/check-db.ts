import { db } from '../server/db.js';

async function checkDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    const start = Date.now();
    await db.execute('SELECT 1 as test');
    const duration = Date.now() - start;
    
    console.log(`✅ Database connection successful (${duration}ms)`);
    
    // Check if users table exists and has data
    const users = await db.query.users.findMany({ limit: 5 });
    console.log(`📊 Found ${users.length} users in database`);
    
    if (users.length > 0) {
      console.log('👥 Existing users:');
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.role})`);
      });
    } else {
      console.log('📝 No users found - database needs seeding');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if your DATABASE_URL is correct in .env');
    console.log('2. Ensure your database server is running');
    console.log('3. Test network connectivity to your database');
    console.log('4. For Render/external databases, check if local connections are allowed');
    
    process.exit(1);
  }
}

checkDatabase();