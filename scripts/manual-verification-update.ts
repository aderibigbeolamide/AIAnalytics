// Manually update a specific registration with verification code
import { mongoStorage } from '../server/mongodb-storage.js';

async function updateSpecificRegistration() {
  try {
    // Get the specific registration
    const registration = await mongoStorage.getEventRegistrationByUniqueId('MEMBER_1754175181834_R7O2JX');
    
    if (!registration) {
      console.log('Registration not found');
      return;
    }
    
    console.log('Found registration:', {
      id: registration._id,
      name: `${registration.firstName} ${registration.lastName}`,
      currentData: registration.registrationData
    });
    
    // Update with verification code
    const updatedData = {
      ...registration.registrationData,
      manualVerificationCode: '123456'
    };
    
    const updateResult = await mongoStorage.updateEventRegistration(registration._id!.toString(), {
      registrationData: updatedData
    });
    
    console.log('Update completed');
    
    // Verify the update
    const updated = await mongoStorage.getEventRegistration(registration._id!.toString());
    console.log('Verification code after update:', updated?.registrationData?.manualVerificationCode);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateSpecificRegistration();