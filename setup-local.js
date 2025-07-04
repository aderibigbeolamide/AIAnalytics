#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 EventValidate Local Setup\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file...');
  const envTemplate = `# Database Configuration
DATABASE_URL=postgresql://eventvalidate:password@localhost:5432/eventvalidate

# JWT Security
JWT_SECRET=your-very-secure-jwt-secret-key-change-this-in-production

# Application Environment
NODE_ENV=development
PORT=5000

# Email Configuration (Optional - for registration confirmations)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@domain.com
# SMTP_PASS=your-app-password
`;
  
  fs.writeFileSync('.env', envTemplate);
  console.log('✅ .env file created with default configuration');
  console.log('⚠️  Please update DATABASE_URL with your PostgreSQL connection string\n');
} else {
  console.log('✅ .env file already exists\n');
}

console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

console.log('🗄️  Setting up database...');
try {
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Database schema created\n');
} catch (error) {
  console.error('❌ Failed to setup database. Please check your DATABASE_URL in .env');
  console.error('Make sure PostgreSQL is running and connection details are correct\n');
}

console.log('👤 Creating admin user...');
try {
  execSync('node scripts/seed.ts', { stdio: 'inherit' });
  console.log('✅ Admin user created\n');
} catch (error) {
  console.log('⚠️  Admin user may already exist or database connection failed\n');
}

console.log('🎉 Setup complete!\n');
console.log('To start the development server:');
console.log('  npm run dev\n');
console.log('Then visit: http://localhost:5000');
console.log('Admin login: admin / password123\n');