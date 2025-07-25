#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up EventValidate for local development...\n');

try {
  // Step 1: Build the frontend
  console.log('📦 Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 2: Copy build files to server directory
  console.log('📁 Copying build files to server directory...');
  
  const distPath = path.join(__dirname, 'dist', 'public');
  const serverPublicPath = path.join(__dirname, 'server', 'public');
  
  // Remove existing server/public if it exists
  if (fs.existsSync(serverPublicPath)) {
    fs.rmSync(serverPublicPath, { recursive: true, force: true });
  }
  
  // Copy dist/public to server/public
  fs.cpSync(distPath, serverPublicPath, { recursive: true });
  
  console.log('✅ Frontend build copied to server/public');
  
  // Step 3: Check for environment file
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('\n⚠️  .env file not found!');
    console.log('Please create a .env file with your database configuration.');
    console.log('See LOCAL_SETUP.md for the required environment variables.\n');
  } else {
    console.log('✅ Environment file found');
  }
  
  console.log('\n🎉 Setup complete! You can now run:');
  console.log('   npm run dev');
  console.log('\n🔗 Application will be available at: http://localhost:5000');
  console.log('🔑 Default login: admin / password123');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}