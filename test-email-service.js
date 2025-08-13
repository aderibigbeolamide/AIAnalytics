/**
 * Email Service Test Script
 * 
 * This script tests the email functionality with your Zoho SMTP credentials.
 * Run this script to verify your email configuration is working correctly.
 * 
 * Usage: node test-email-service.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailService() {
  console.log('🧪 Testing EventValidate Email Service...\n');

  // Email configuration
  const config = {
    host: process.env.MAILER_HOST || 'smtp.zoho.eu',
    port: parseInt(process.env.MAILER_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAILER_USER || 'admin@letbud.com',
      pass: process.env.MAILER_PASS || 'JCrSaUVGCnyD',
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('📧 Email Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.auth.user}`);
  console.log(`   Pass: ${'*'.repeat(config.auth.pass.length)}\n`);

  try {
    // Create transporter
    console.log('🔧 Creating email transporter...');
    const transporter = nodemailer.createTransporter(config);

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    const testEmail = {
      from: `"EventValidate Test" <${config.auth.user}>`,
      to: config.auth.user, // Send to self for testing
      subject: 'EventValidate Email Service Test',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .success { color: #10B981; font-weight: bold; }
              .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 EventValidate Email Test</h1>
              </div>
              <div class="content">
                <h2>Email Service Test Successful!</h2>
                <p class="success">✅ Your EventValidate email service is working correctly!</p>
                
                <h3>Test Details:</h3>
                <ul>
                  <li><strong>SMTP Host:</strong> ${config.host}</li>
                  <li><strong>Port:</strong> ${config.port}</li>
                  <li><strong>From Address:</strong> ${config.auth.user}</li>
                  <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>

                <h3>What's Working:</h3>
                <ul>
                  <li>✅ SMTP Connection established</li>
                  <li>✅ Authentication successful</li>
                  <li>✅ Email sending functional</li>
                  <li>✅ HTML emails supported</li>
                </ul>

                <p>Your EventValidate platform is now ready to send:</p>
                <ul>
                  <li>📧 Organization approval emails</li>
                  <li>⏰ Event reminder notifications</li>
                  <li>💳 Payment confirmation emails</li>
                  <li>🎫 Registration confirmations with PDF tickets</li>
                  <li>📢 Bulk event communications</li>
                </ul>

                <p><strong>Next Steps:</strong></p>
                <ol>
                  <li>Start your EventValidate server</li>
                  <li>Create events and registrations</li>
                  <li>Monitor email queue via API: <code>GET /api/email/queue-status</code></li>
                  <li>Test bulk emails via: <code>POST /api/email/test</code></li>
                </ol>
              </div>
              <div class="footer">
                <p>&copy; 2025 EventValidate - AI-Powered Event Management</p>
                <p>This is an automated test email from your EventValidate system</p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipients: ${testEmail.to}`);
    console.log(`   Subject: ${testEmail.subject}\n`);

    console.log('🎉 Email Service Test Complete!');
    console.log('💡 Your EventValidate email system is fully functional.');
    console.log('📧 Check your inbox for the test email confirmation.');

  } catch (error) {
    console.error('❌ Email Service Test Failed!');
    console.error('Error details:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔐 Authentication Error:');
      console.error('   - Verify your email username and password');
      console.error('   - Check if 2FA is enabled (may need app password)');
      console.error('   - Ensure SMTP is enabled for your Zoho account');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🌐 Connection Error:');
      console.error('   - Check your internet connection');
      console.error('   - Verify SMTP host and port settings');
      console.error('   - Check firewall settings');
    } else if (error.code === 'EMESSAGE') {
      console.error('\n📧 Message Error:');
      console.error('   - Check email format and content');
      console.error('   - Verify sender and recipient addresses');
    }
    
    console.error('\n💡 Troubleshooting Tips:');
    console.error('   1. Double-check your .env file settings');
    console.error('   2. Try enabling "Less Secure Apps" if using Gmail/Yahoo');
    console.error('   3. Use app-specific passwords for accounts with 2FA');
    console.error('   4. Contact your email provider for SMTP support');
    
    process.exit(1);
  }
}

// Run the test
testEmailService();