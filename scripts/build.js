#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🏗️  Building EventValidate application...');

// Determine environment
const nodeEnv = process.env.NODE_ENV || 'development';
const isReplit = !!process.env.REPL_ID;
const isProduction = nodeEnv === 'production';

console.log(`📦 Environment: ${nodeEnv}`);
console.log(`🚀 Runtime: ${isReplit ? 'Replit' : 'Local'}`);

try {
  // Step 1: Build the client application
  console.log('📦 Building client application...');
  execSync('npm run build:client', { stdio: 'inherit', cwd: rootDir });
  
  // Step 2: Ensure server/public directory exists
  const serverPublicDir = resolve(rootDir, 'server', 'public');
  if (!existsSync(serverPublicDir)) {
    mkdirSync(serverPublicDir, { recursive: true });
  }
  
  // Step 3: Copy built files to server/public (required for Replit environment)
  const distPublicDir = resolve(rootDir, 'dist', 'public');
  if (existsSync(distPublicDir)) {
    console.log('📁 Copying static files to server/public...');
    cpSync(distPublicDir, serverPublicDir, { recursive: true });
  }
  
  // Step 4: Build server for production
  if (isProduction) {
    console.log('🔧 Building server for production...');
    execSync('npm run build:server', { stdio: 'inherit', cwd: rootDir });
  }
  
  console.log('✅ Build completed successfully!');
  
  // Environment-specific messages
  if (isReplit) {
    console.log('🟢 Ready for Replit deployment');
  } else if (isProduction) {
    console.log('🚀 Ready for production deployment');
    console.log('💡 Run "npm start" to start the production server');
  } else {
    console.log('🛠️  Ready for development');
    console.log('💡 Run "npm run dev" to start the development server');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}