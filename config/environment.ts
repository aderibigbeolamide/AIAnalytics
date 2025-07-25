import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables using dotenv with automatic detection
const loadEnvConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Load base .env file if it exists
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log('✅ Loaded environment variables from .env file');
  }
  
  // Load environment-specific .env file if it exists
  const envSpecificPath = resolve(process.cwd(), `.env.${nodeEnv}`);
  if (existsSync(envSpecificPath)) {
    config({ path: envSpecificPath, override: true });
    console.log(`✅ Loaded environment-specific variables from .env.${nodeEnv}`);
  }
  
  // If no .env files found, use system environment variables
  if (!existsSync(envPath) && !existsSync(envSpecificPath)) {
    console.log('🔧 No .env files found, using system environment variables');
  }
};

// Initialize environment configuration
loadEnvConfig();

// Environment configuration - reads from your .env files automatically
export const env = {
  // Core application settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // Database configuration  
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eventvalidate',
  
  // Security settings
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'fallback-32-character-key-12345678',
  
  // Application domain
  APP_DOMAIN: process.env.APP_DOMAIN || (
    process.env.NODE_ENV === 'production' 
      ? `https://${process.env.REPL_SLUG || 'your-app'}.${process.env.REPL_OWNER || 'replit'}.repl.co`
      : process.env.REPL_ID 
        ? 'http://localhost:5000'  // Replit environment
        : 'http://localhost:3000'  // Local development
  ),
  
  // Email configuration
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  
  // Payment integration
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
  
  // Analytics
  GTM_ID: process.env.GTM_ID || '',
  
  // File upload settings
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  
  // Runtime detection
  IS_REPLIT: !!process.env.REPL_ID,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV !== 'production'
};

// Validation for required environment variables
export const validateEnvironment = () => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if using fallback values (indicates .env file missing or incomplete)
  if (env.DATABASE_URL === 'postgresql://postgres:postgres@localhost:5432/eventvalidate') {
    warnings.push('Using fallback DATABASE_URL - consider creating .env file with your database URL');
  }
  
  if (env.JWT_SECRET === 'fallback-jwt-secret-for-development-only') {
    warnings.push('Using fallback JWT_SECRET - consider creating .env file with secure JWT secret');
  }
  
  if (env.ENCRYPTION_KEY === 'fallback-32-character-key-12345678') {
    warnings.push('Using fallback ENCRYPTION_KEY - consider creating .env file with secure encryption key');
  }
  
  // Additional production validations
  if (env.IS_PRODUCTION) {
    if (env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('fallback')) {
      errors.push('DATABASE_URL must be set to a production database URL in production');
    }
    
    if (env.JWT_SECRET.includes('fallback') || env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be set to a secure value (32+ chars) in production');
    }
    
    if (env.ENCRYPTION_KEY.includes('fallback') || env.ENCRYPTION_KEY.length < 32) {
      errors.push('ENCRYPTION_KEY must be set to a secure value (32+ chars) in production');
    }
  }
  
  // Log warnings in development
  if (warnings.length > 0 && !env.IS_PRODUCTION) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  // Handle errors
  if (errors.length > 0) {
    console.error('❌ Environment validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (env.IS_PRODUCTION) {
      throw new Error('Invalid production environment configuration');
    }
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed');
  } else if (errors.length === 0) {
    console.log('✅ Environment loaded with fallback values for development');
  }
};

// Log environment status
export const logEnvironmentStatus = () => {
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🚀 Runtime: ${env.IS_REPLIT ? 'Replit' : 'Local'}`);
  console.log(`🗄️  Database: ${env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
  console.log(`🌐 Domain: ${env.APP_DOMAIN}`);
  console.log(`📁 Upload directory: ${env.UPLOAD_DIR}`);
  
  if (env.SMTP_HOST) {
    console.log(`📧 Email: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  }
  
  if (env.PAYSTACK_SECRET_KEY) {
    console.log(`💳 Paystack: configured`);
  }
  
  if (env.GTM_ID) {
    console.log(`📊 Analytics: ${env.GTM_ID}`);
  }
};