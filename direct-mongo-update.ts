// Direct MongoDB update using the same connection as the server
import { mongoStorage } from './server/mongodb-storage.js';

async function updateRegistrationCode() {
  try {
    // Get all registrations for the event
    const registrations = await mongoStorage.getEventRegistrations('688e5119c52f7fc80bafe2df');
    console.log(`Found ${registrations.length} registrations`);
    
    if (registrations.length > 0) {
      const firstReg = registrations[0];
      console.log(`Updating registration for ${firstReg.firstName} ${firstReg.lastName}`);
      
      // Update the registration data to include verification code
      const updatedData = {
        ...firstReg.registrationData,
        manualVerificationCode: '123456'
      };
      
      await mongoStorage.updateEventRegistration(firstReg._id!.toString(), {
        registrationData: updatedData
      });
      
      console.log('Successfully added verification code 123456');
      
      // Verify the update
      const updated = await mongoStorage.getEventRegistration(firstReg._id!.toString());
      console.log('Verification code in updated registration:', updated?.registrationData?.manualVerificationCode);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateRegistrationCode();