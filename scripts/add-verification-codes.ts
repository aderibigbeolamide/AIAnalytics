// Add manual verification codes to all existing registrations
import { mongoStorage } from '../server/mongodb-storage.js';

async function addVerificationCodes() {
  try {
    // Get all events
    const events = await mongoStorage.getEvents();
    console.log(`Found ${events.length} events`);
    
    for (const event of events) {
      console.log(`\nProcessing event: ${event.name}`);
      const registrations = await mongoStorage.getEventRegistrations(event._id!.toString());
      console.log(`Found ${registrations.length} registrations`);
      
      let updatedCount = 0;
      for (const registration of registrations) {
        // Check if it already has a verification code
        if (!registration.registrationData?.manualVerificationCode) {
          // Generate a 6-digit code
          const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Update the registration
          const updatedData = {
            ...registration.registrationData,
            manualVerificationCode: verificationCode
          };
          
          await mongoStorage.updateEventRegistration(registration._id!.toString(), {
            registrationData: updatedData
          });
          
          console.log(`Added code ${verificationCode} for ${registration.firstName} ${registration.lastName}`);
          updatedCount++;
        }
      }
      
      console.log(`Updated ${updatedCount} registrations for event ${event.name}`);
    }
    
    console.log('\nVerification codes added successfully!');
  } catch (error) {
    console.error('Error adding verification codes:', error);
  }
}

addVerificationCodes();