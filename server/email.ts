import nodemailer from 'nodemailer';

// Create transporter for SMTP email sending
const transporter = nodemailer.createTransport({
  host: process.env.MAILER_HOST,
  port: parseInt(process.env.MAILER_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PASS
  }
});

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachment?: Buffer;
  filename?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    console.log('Attempting to send email to:', params.to);
    console.log('From:', params.from);
    
    const mailOptions: any = {
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    if (params.attachment && params.filename) {
      mailOptions.attachments = [{
        filename: params.filename,
        content: params.attachment,
        contentType: 'image/png'
      }];
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
}

export function generateRegistrationCardHTML(registration: any, event: any, qrImageBase64: string): string {
  const memberName = registration.guestName || 
    (registration.member && registration.member.firstName && registration.member.lastName 
      ? `${registration.member.firstName} ${registration.member.lastName}` 
      : registration.member?.firstName || registration.member?.lastName || 'Guest');
  
  const auxiliaryBody = registration.guestAuxiliaryBody || 
    (registration.member ? registration.member.auxiliaryBody : 'Guest');
  
  const chandaNumber = registration.guestChandaNumber || 
    (registration.member ? registration.member.chandaNumber : 'N/A');
  
  const email = registration.guestEmail || 
    (registration.member ? registration.member.email : 'N/A');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Event Registration Card</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background-color: #f5f5f5; 
        }
        .card { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 15px; 
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12); 
          overflow: hidden;
          border: 1px solid #e0e0e0;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
          position: relative;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
        }
        .header h1 { 
          margin: 0; 
          font-size: 32px; 
          font-weight: 700; 
          position: relative;
          z-index: 1;
        }
        .header p { 
          margin: 15px 0 0 0; 
          opacity: 0.9; 
          font-size: 18px; 
          position: relative;
          z-index: 1;
        }
        .content { 
          padding: 40px; 
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 25px; 
          margin-bottom: 35px; 
        }
        .info-item { 
          padding: 20px; 
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
          border-radius: 12px; 
          border-left: 5px solid #667eea; 
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s ease;
        }
        .info-item:hover {
          transform: translateY(-2px);
        }
        .info-label { 
          font-size: 12px; 
          color: #666; 
          text-transform: uppercase; 
          margin-bottom: 5px; 
          font-weight: 600; 
        }
        .info-value { 
          font-size: 16px; 
          color: #333; 
          font-weight: 500; 
        }
        .qr-section { 
          text-align: center; 
          padding: 30px; 
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
          border-radius: 15px; 
          margin-top: 30px; 
          border: 1px solid #dee2e6;
        }
        .qr-code { 
          width: 220px; 
          height: 220px; 
          margin: 0 auto 20px; 
          border: 3px solid #667eea; 
          border-radius: 15px; 
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
        }
        .unique-id { 
          font-family: 'Courier New', monospace; 
          font-size: 28px; 
          font-weight: bold; 
          color: #667eea; 
          padding: 18px 30px; 
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%); 
          border-radius: 12px; 
          border: 3px solid #667eea; 
          letter-spacing: 4px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
          text-align: center;
          display: inline-block;
          min-width: 200px;
        }
        .instructions { 
          margin-top: 30px; 
          padding: 20px; 
          background: #e8f4fd; 
          border-radius: 8px; 
          border-left: 4px solid #1976d2; 
        }
        .instructions h3 { 
          margin: 0 0 10px 0; 
          color: #1976d2; 
          font-size: 18px; 
        }
        .instructions p { 
          margin: 5px 0; 
          color: #555; 
          line-height: 1.5; 
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          color: #666; 
          font-size: 14px; 
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-member { background: #e8f5e8; color: #2e7d32; }
        .status-guest { background: #fff3e0; color: #f57c00; }
        .status-invitee { background: #f3e5f5; color: #7b1fa2; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Event Registration</h1>
          <p>${event.name}</p>
        </div>
        
        <div class="content">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${memberName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Registration Type</div>
              <div class="info-value">
                <span class="status-badge status-${registration.registrationType}">
                  ${registration.registrationType.toUpperCase()}
                </span>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${email}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Event Date</div>
              <div class="info-value">${new Date(event.startDate).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Event Time</div>
              <div class="info-value">${event.startTime || 'TBA'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Location</div>
              <div class="info-value">${event.location}</div>
            </div>
          </div>

          ${registration.guestPost ? `
            <div class="info-item" style="grid-column: 1 / -1;">
              <div class="info-label">Post/Position</div>
              <div class="info-value">${registration.guestPost}</div>
            </div>
          ` : ''}
          
          <div class="qr-section">
            <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">Event Access</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 30px;">
              <div style="flex: 1;">
                <img src="data:image/png;base64,${qrImageBase64}" alt="QR Code" class="qr-code">
                <div style="margin-top: 15px; color: #666; font-size: 14px;">
                  <strong>Scan QR Code at Event</strong>
                </div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="margin-bottom: 15px; color: #666; font-size: 16px;">
                  <strong>Manual Verification ID</strong>
                </div>
                <div class="unique-id">${registration.uniqueId}</div>
                <div style="margin-top: 15px; color: #888; font-size: 12px; line-height: 1.4;">
                  Present this ID if QR scanning<br>is not available
                </div>
              </div>
            </div>
          </div>
          
          <div class="instructions">
            <h3 style="color: #333; margin-bottom: 20px; font-size: 18px;">Check-in Instructions</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div style="padding: 15px; background: #f0f4ff; border-radius: 8px; border-left: 4px solid #667eea;">
                <h4 style="margin: 0 0 10px 0; color: #667eea; font-size: 16px;">QR Code Method</h4>
                <p style="margin: 0; font-size: 14px; color: #555;">Show your QR code at the event entrance for instant verification</p>
              </div>
              <div style="padding: 15px; background: #f0f4ff; border-radius: 8px; border-left: 4px solid #667eea;">
                <h4 style="margin: 0 0 10px 0; color: #667eea; font-size: 16px;">Manual Method</h4>
                <p style="margin: 0; font-size: 14px; color: #555;">Provide your Unique ID: <strong>${registration.uniqueId}</strong> to event staff</p>
              </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
              <p style="margin: 0; font-size: 14px; color: #856404; text-align: center;">
                <strong>Important:</strong> Keep this card accessible on your device or print it. Contact organizers if you need assistance.
              </p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Event: ${event.name} | Location: ${event.location}</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}