#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🔧 Setting up EventValidate for local development...');

try {
  // Step 1: Clean any existing build artifacts
  const distDir = resolve(rootDir, 'dist');
  const serverPublicDir = resolve(rootDir, 'server', 'public');
  
  console.log('🧹 Cleaning existing build artifacts...');
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
  }
  if (existsSync(serverPublicDir)) {
    rmSync(serverPublicDir, { recursive: true, force: true });
  }

  // Step 2: Build the client application
  console.log('📦 Building client application...');
  execSync('vite build', { stdio: 'inherit', cwd: rootDir });
  
  // Step 3: Ensure server/public directory exists
  console.log('📁 Creating server/public directory...');
  mkdirSync(serverPublicDir, { recursive: true });
  
  // Step 4: Copy built files to server/public
  const distPublicDir = resolve(rootDir, 'dist', 'public');
  console.log('📋 Copying static files to server/public...');
  cpSync(distPublicDir, serverPublicDir, { recursive: true });
  
  console.log('✅ Local setup completed successfully!');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Make sure you have a .env file with your database configuration');
  console.log('2. Run: npm run db:push (to setup database schema)');
  console.log('3. Run: npm run seed (to create admin user)');
  console.log('4. Run: npm run dev (to start development server)');
  console.log('');
  console.log('📋 Required .env variables:');
  console.log('DATABASE_URL=postgresql://username:password@localhost:5432/eventvalidate');
  console.log('JWT_SECRET=your-secure-jwt-secret');
  console.log('ENCRYPTION_KEY=your-32-character-encryption-key');
  console.log('NODE_ENV=development');
  console.log('PORT=3000');
  console.log('APP_DOMAIN=http://localhost:3000');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  console.error('');
  console.error('🔍 Troubleshooting:');
  console.error('1. Make sure you have Node.js 18+ installed');
  console.error('2. Run: npm install (to install dependencies)');
  console.error('3. Check that all dependencies are properly installed');
  process.exit(1);
}