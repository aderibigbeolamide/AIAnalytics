import mongoose from 'mongoose';
import { EventRegistration } from './shared/mongoose-schema.ts';
import dotenv from 'dotenv';

dotenv.config();

async function debugVerificationLookup() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventvalidate');
    console.log('Connected successfully');
    
    const searchCode = 'OUGKCG';
    console.log(`\nSearching for verification code: ${searchCode}`);
    
    // Search all possible locations
    console.log('\n1. Searching by uniqueId...');
    const byUniqueId = await EventRegistration.findOne({ uniqueId: searchCode });
    console.log('Result:', byUniqueId ? `FOUND: ${byUniqueId.firstName} ${byUniqueId.lastName}` : 'NOT FOUND');
    
    console.log('\n2. Searching by manualVerificationCode (root level)...');
    const byRootCode = await EventRegistration.findOne({ manualVerificationCode: searchCode });
    console.log('Result:', byRootCode ? `FOUND: ${byRootCode.firstName} ${byRootCode.lastName}` : 'NOT FOUND');
    
    console.log('\n3. Searching by registrationData.manualVerificationCode...');
    const byNestedCode = await EventRegistration.findOne({ 'registrationData.manualVerificationCode': searchCode });
    console.log('Result:', byNestedCode ? `FOUND: ${byNestedCode.firstName} ${byNestedCode.lastName}` : 'NOT FOUND');
    
    console.log('\n4. Combined search (as used in getEventRegistrationByUniqueId)...');
    const combined = await EventRegistration.findOne({
      $or: [
        { uniqueId: searchCode },
        { 'registrationData.manualVerificationCode': searchCode },
        { manualVerificationCode: searchCode }
      ]
    });
    console.log('Result:', combined ? `FOUND: ${combined.firstName} ${combined.lastName}` : 'NOT FOUND');
    
    // Show sample registrations to understand structure
    console.log('\n5. Sample registrations to understand data structure:');
    const sampleRegs = await EventRegistration.find({}).limit(5).sort({ createdAt: -1 });
    sampleRegs.forEach((reg, i) => {
      console.log(`\nRegistration ${i + 1}: ${reg.firstName} ${reg.lastName}`);
      console.log('  _id:', reg._id?.toString());
      console.log('  uniqueId:', reg.uniqueId);
      console.log('  manualVerificationCode:', reg.manualVerificationCode);
      console.log('  registrationData:', JSON.stringify(reg.registrationData, null, 2));
      console.log('  status:', reg.status);
      console.log('  eventId:', reg.eventId);
    });
    
    // Search for any registrations with manual verification codes
    console.log('\n6. All registrations with manual verification codes:');
    const withCodes = await EventRegistration.find({
      $or: [
        { manualVerificationCode: { $exists: true, $ne: null } },
        { 'registrationData.manualVerificationCode': { $exists: true, $ne: null } }
      ]
    }).limit(10);
    
    console.log(`Found ${withCodes.length} registrations with manual verification codes:`);
    withCodes.forEach((reg, i) => {
      console.log(`${i + 1}. ${reg.firstName} ${reg.lastName}`);
      console.log('   Root code:', reg.manualVerificationCode);
      console.log('   Nested code:', reg.registrationData?.manualVerificationCode);
    });
    
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugVerificationLookup();