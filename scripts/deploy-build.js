#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🚀 Building EventValidate for deployment...');

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
  
  // Step 3: Build the server application
  console.log('🔧 Building server application...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit', cwd: rootDir });
  
  // Step 4: Ensure server/public directory exists
  console.log('📁 Creating server/public directory...');
  mkdirSync(serverPublicDir, { recursive: true });
  
  // Step 5: Copy built files to server/public
  const distPublicDir = resolve(rootDir, 'dist', 'public');
  if (existsSync(distPublicDir)) {
    console.log('📋 Copying static files to server/public...');
    cpSync(distPublicDir, serverPublicDir, { recursive: true });
  } else {
    console.log('⚠️  Warning: dist/public directory not found, continuing...');
  }
  
  console.log('✅ Deployment build completed successfully!');
  console.log('');
  console.log('📁 Build artifacts:');
  console.log('  - dist/index.js (Server bundle)');
  console.log('  - server/public/ (Static files)');
  console.log('');
  console.log('🚀 Ready for deployment with:');
  console.log('  Build Command: node scripts/deploy-build.js');
  console.log('  Start Command: npm start');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('');
  console.error('🔍 Troubleshooting:');
  console.error('1. Make sure you have Node.js 18+ installed');
  console.error('2. Run: npm install (to install dependencies)');
  console.error('3. Check that all dependencies are properly installed');
  console.error('4. Verify esbuild is available in node_modules');
  process.exit(1);
}