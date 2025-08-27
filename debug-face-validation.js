import mongoose from 'mongoose';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Check all face registrations in AWS
    console.log('\n=== Checking AWS Face Collection ===');
    const searchResult = await faceRecognitionService.searchFace('./uploads/face_photos_musodiq_test.jpeg', 85);
    console.log('Face Search Results:', JSON.stringify(searchResult, null, 2));

    if (searchResult.success && searchResult.matchFound) {
      console.log('\n=== Found Face Matches ===');
      searchResult.matches.forEach((match, index) => {
        console.log(`Match ${index + 1}:`);
        console.log(`  User ID: ${match.userId}`);
        console.log(`  Face ID: ${match.faceId}`);
        console.log(`  Similarity: ${match.similarity}%`);
        console.log(`  Confidence: ${match.confidence}%`);
        
        // Parse the user ID
        const userIdParts = match.userId.split('_');
        console.log(`  Parsed - Event ID: ${userIdParts[0]}`);
        console.log(`  Parsed - First Name: ${userIdParts[1]}`);
        console.log(`  Parsed - Last Name: ${userIdParts[2]}`);
      });
    }

    // Check actual event registrations
    console.log('\n=== Checking Recent Event Registrations ===');
    const eventRegistrations = await mongoose.connection.db.collection('eventregistrations').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    eventRegistrations.forEach((reg, index) => {
      console.log(`\nRegistration ${index + 1}:`);
      console.log(`  ID: ${reg._id}`);
      console.log(`  Name: ${reg.firstName} ${reg.lastName}`);
      console.log(`  Email: ${reg.email}`);
      console.log(`  Event ID: ${reg.eventId}`);
      console.log(`  Face User ID: ${reg.registrationData?.faceUserId || 'Not set'}`);
      console.log(`  AWS Face ID: ${reg.awsFaceId || 'Not set'}`);
      console.log(`  Face Photo Path: ${reg.facePhotoPath || 'Not set'}`);
      console.log(`  Status: ${reg.status}`);
      console.log(`  Created: ${reg.createdAt}`);
    });

    // Check available events
    console.log('\n=== Checking Available Events ===');
    const events = await mongoose.connection.db.collection('events').find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    events.forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`);
      console.log(`  ID: ${event._id}`);
      console.log(`  Name: ${event.name}`);
      console.log(`  Status: ${event.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error during debugging:', error);
    process.exit(1);
  }
};

connectDB();