import { mongoStorage } from './mongodb-storage.js';

async function addMissingVerificationCodes() {
  try {
    console.log('Starting verification code generation...');
    
    // Get all events
    const events = await mongoStorage.getEvents();
    
    for (const event of events) {
      console.log(`Processing event: ${event.name} (${event._id})`);
      
      // Get all registrations for this event
      const registrations = await mongoStorage.getEventRegistrations((event as any)._id.toString());
      
      for (const registration of registrations) {
        // Check if manual verification code is missing
        const hasRootCode = (registration as any).manualVerificationCode;
        const hasNestedCode = (registration as any).registrationData?.manualVerificationCode;
        
        if (!hasRootCode && !hasNestedCode) {
          // Generate verification code based on event type
          let verificationCode;
          
          const isTicketEvent = (event as any).eventType === 'ticketed';
          
          if (isTicketEvent) {
            // Numeric codes for ticket events
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
          } else {
            // Alphabetic codes for registration events  
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            verificationCode = Array.from({length: 6}, () => chars[Math.floor(Math.random() * 26)]).join('');
          }
          
          // Update registration with verification code
          const updateData = {
            manualVerificationCode: verificationCode,
            registrationData: {
              ...(registration as any).registrationData,
              manualVerificationCode: verificationCode
            }
          };
          
          await mongoStorage.updateEventRegistration((registration as any)._id.toString(), updateData);
          
          console.log(`Added code ${verificationCode} for ${registration.firstName} ${registration.lastName}`);
        } else {
          console.log(`${registration.firstName} ${registration.lastName} already has verification code`);
        }
      }
    }
    
    console.log('Verification code generation completed successfully');
    
  } catch (error) {
    console.error('Error adding verification codes:', error);
  }
}

// Export for use as API endpoint
export { addMissingVerificationCodes };