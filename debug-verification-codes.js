import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Directly connect to MongoDB and query the collections
const EventRegistration = mongoose.model('EventRegistration', new mongoose.Schema({}, { strict: false }));

dotenv.config();

async function debugVerificationCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all registrations for the specific event
    const eventId = '689237e6359507c3678a53b5'; // The event mentioned
    const registrations = await EventRegistration.find({ eventId: new mongoose.Types.ObjectId(eventId) });
    
    console.log(`\nFound ${registrations.length} registrations for event ${eventId}:`);
    
    for (const reg of registrations) {
      console.log(`\n--- Registration ${reg._id.toString()} ---`);
      console.log(`Name: ${reg.firstName} ${reg.lastName}`);
      console.log(`Email: ${reg.email}`);
      console.log(`Status: ${reg.status}`);
      console.log(`Payment Status: ${reg.paymentStatus}`);
      console.log(`Unique ID: ${reg.uniqueId}`);
      console.log(`Manual Verification Code (root): ${reg.manualVerificationCode || 'NOT SET'}`);
      console.log(`Manual Verification Code (registrationData): ${reg.registrationData?.manualVerificationCode || 'NOT SET'}`);
      console.log(`Registration Data Keys: ${reg.registrationData ? Object.keys(reg.registrationData).join(', ') : 'No registrationData'}`);
    }
    
    // Also check for any recent registrations that might have verification codes
    console.log('\n\n=== Checking all recent registrations with verification codes ===');
    const allRegistrations = await EventRegistration.find({
      $or: [
        { manualVerificationCode: { $exists: true, $ne: null } },
        { 'registrationData.manualVerificationCode': { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`Found ${allRegistrations.length} registrations with verification codes:`);
    for (const reg of allRegistrations) {
      console.log(`- ${reg.firstName} ${reg.lastName} (${reg.eventId}): ${reg.manualVerificationCode || reg.registrationData?.manualVerificationCode}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugVerificationCodes();