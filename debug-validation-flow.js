import mongoose from 'mongoose';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Search for faces that match the uploaded image
    console.log('Searching for face matches...');
    const searchResult = await faceRecognitionService.searchFace('./uploads/face_photos_musodiq_test.jpeg', 85);
    
    if (searchResult.success && searchResult.matchFound) {
      console.log('\n=== Face Search Results ===');
      searchResult.matches.forEach((match, index) => {
        console.log(`Match ${index + 1}:`);
        console.log(`  User ID: ${match.userId}`);
        console.log(`  Face ID: ${match.faceId}`);
        console.log(`  Similarity: ${match.similarity}%`);
        
        // Parse the user ID to extract event information
        const userIdParts = match.userId.split('_');
        console.log(`  Parsed Event ID: ${userIdParts[0]}`);
        console.log(`  Parsed First Name: ${userIdParts[1]}`);
        console.log(`  Parsed Last Name: ${userIdParts[2]}`);
      });
      
      // Check what happens during validation for each match
      for (const match of searchResult.matches) {
        console.log(`\n=== Validating Match: ${match.userId} ===`);
        
        const userIdParts = match.userId.split('_');
        const matchedEventId = userIdParts[0];
        
        console.log(`Looking for registrations in event: ${matchedEventId}`);
        
        // Get registrations for this event
        try {
          const eventRegistrations = await mongoose.connection.db.collection('eventregistrations')
            .find({ eventId: new mongoose.Types.ObjectId(matchedEventId) })
            .toArray();
          
          console.log(`Found ${eventRegistrations.length} registrations for event ${matchedEventId}`);
          
          // Look for matching registration
          const matchingRegistration = eventRegistrations.find(reg => {
            const faceUserIdMatch = reg.registrationData?.faceUserId === match.userId;
            const nameMatch = reg.firstName?.toLowerCase() === userIdParts[1]?.toLowerCase() && 
                            reg.lastName?.toLowerCase() === userIdParts[2]?.toLowerCase();
            
            console.log(`  Checking registration ${reg._id}:`);
            console.log(`    Name: ${reg.firstName} ${reg.lastName}`);
            console.log(`    Face User ID: ${reg.registrationData?.faceUserId || 'Not set'}`);
            console.log(`    Face User ID Match: ${faceUserIdMatch}`);
            console.log(`    Name Match: ${nameMatch}`);
            
            return faceUserIdMatch || nameMatch;
          });
          
          if (matchingRegistration) {
            console.log(`✅ Found matching registration: ${matchingRegistration._id}`);
            console.log(`   Name: ${matchingRegistration.firstName} ${matchingRegistration.lastName}`);
            console.log(`   Status: ${matchingRegistration.status}`);
            console.log(`   Face User ID: ${matchingRegistration.registrationData?.faceUserId}`);
          } else {
            console.log(`❌ No matching registration found for ${match.userId}`);
          }
          
        } catch (error) {
          console.log(`Error checking event ${matchedEventId}:`, error.message);
        }
      }
    }

    // Check what events are available for testing
    console.log('\n=== Available Events ===');
    const events = await mongoose.connection.db.collection('events').find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`);
      console.log(`  ID: ${event._id}`);
      console.log(`  Name: ${event.name}`);
      console.log(`  Status: ${event.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error during debugging:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

connectDB();