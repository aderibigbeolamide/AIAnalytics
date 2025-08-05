#!/usr/bin/env node

/**
 * Event Reminder Scheduler
 * 
 * This script can be run as a cron job to automatically process event reminders.
 * 
 * Usage:
 * npx tsx scripts/reminder-scheduler.ts
 * 
 * Cron job examples:
 * # Run every 2 hours
 * 0 */2 * * * /usr/bin/npx tsx /path/to/your/app/scripts/reminder-scheduler.ts
 * 
 * # Run at 9 AM and 6 PM daily
 * 0 9,18 * * * /usr/bin/npx tsx /path/to/your/app/scripts/reminder-scheduler.ts
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.APP_DOMAIN || 'http://localhost:5000';
const SYSTEM_API_KEY = process.env.SYSTEM_API_KEY || 'your-system-api-key';

async function processReminders() {
  try {
    console.log('🔔 Starting event reminder processing...');
    console.log('Time:', new Date().toISOString());
    
    const response = await fetch(`${API_BASE_URL}/api/system/process-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-System-API-Key': SYSTEM_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json() as { success: boolean; message: string };
    
    if (result.success) {
      console.log('✅ Event reminders processed successfully');
      console.log('Response:', result);
    } else {
      console.error('❌ Failed to process reminders:', result.message);
      process.exit(1);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('❌ Error processing reminders:', errorMessage);
    console.error('Stack:', errorStack);
    process.exit(1);
  }
}

// Run the reminder processing
processReminders()
  .then(() => {
    console.log('🎉 Reminder processing completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });