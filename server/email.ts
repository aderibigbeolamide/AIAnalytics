import * as mailgun from 'mailgun-js';

if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
  console.warn("MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables should be set for email functionality");
}

const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY || '',
  domain: process.env.MAILGUN_DOMAIN || ''
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
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.log("Email would be sent to:", params.to);
      console.log("Subject:", params.subject);
      return true; // Return true for development/testing
    }

    const data: any = {
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    if (params.attachment && params.filename) {
      data.attachment = new mg.Attachment({
        data: params.attachment,
        filename: params.filename,
        contentType: 'image/png'
      });
    }

    await mg.messages().send(data);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export function generateRegistrationCardHTML(registration: any, event: any, qrImageBase64: string): string {
  const memberName = registration.guestName || 
    (registration.member ? `${registration.member.firstName} ${registration.member.lastName}` : 'Guest');
  
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
          border-radius: 12px; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px; 
          font-weight: bold; 
        }
        .header p { 
          margin: 10px 0 0 0; 
          opacity: 0.9; 
          font-size: 16px; 
        }
        .content { 
          padding: 30px; 
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin-bottom: 30px; 
        }
        .info-item { 
          padding: 15px; 
          background: #f8f9fa; 
          border-radius: 8px; 
          border-left: 4px solid #667eea; 
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
          padding: 20px; 
          background: #f8f9fa; 
          border-radius: 8px; 
          margin-top: 20px; 
        }
        .qr-code { 
          width: 200px; 
          height: 200px; 
          margin: 0 auto 15px; 
          border: 2px solid #ddd; 
          border-radius: 8px; 
        }
        .unique-id { 
          font-family: 'Courier New', monospace; 
          font-size: 18px; 
          font-weight: bold; 
          color: #667eea; 
          margin-top: 10px; 
          padding: 10px; 
          background: white; 
          border-radius: 6px; 
          border: 2px dashed #667eea; 
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
              <div class="info-label">Auxiliary Body</div>
              <div class="info-value">${auxiliaryBody}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Chanda Number</div>
              <div class="info-value">${chandaNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${email}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Event Date</div>
              <div class="info-value">${new Date(event.startDate).toLocaleDateString()}</div>
            </div>
          </div>

          ${registration.guestPost ? `
            <div class="info-item" style="grid-column: 1 / -1;">
              <div class="info-label">Post/Position</div>
              <div class="info-value">${registration.guestPost}</div>
            </div>
          ` : ''}
          
          <div class="qr-section">
            <h3 style="margin: 0 0 15px 0; color: #333;">Your Registration QR Code</h3>
            <img src="data:image/png;base64,${qrImageBase64}" alt="QR Code" class="qr-code">
            <div style="margin: 15px 0; color: #666;">
              <strong>Unique ID for Manual Entry:</strong>
            </div>
            <div class="unique-id">${registration.uniqueId}</div>
          </div>
          
          <div class="instructions">
            <h3>Event Check-in Instructions</h3>
            <p>• Present this QR code at the event entrance for quick check-in</p>
            <p>• Alternatively, provide your Unique ID: <strong>${registration.uniqueId}</strong></p>
            <p>• Keep this card accessible on your mobile device or print it out</p>
            <p>• Contact event organizers if you have any issues</p>
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