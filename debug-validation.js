import mongoose from 'mongoose';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Simulate the validation process with your face
    console.log('🔍 Testing face search...');
    const searchResult = await faceRecognitionService.searchFace('./uploads/face_photos_musodiq_test.jpeg', 85);
    
    if (searchResult.success && searchResult.matchFound) {
      console.log('\n=== Face Search Results ===');
      const bestMatch = searchResult.matches[0];
      console.log('Best Match:', {
        userId: bestMatch.userId,
        faceId: bestMatch.faceId,
        similarity: bestMatch.similarity
      });

      // Parse the user ID
      const userIdParts = bestMatch.userId.split('_');
      const matchedEventId = userIdParts[0];
      const matchedFirstName = userIdParts[1]; 
      const matchedLastName = userIdParts[2];
      
      console.log('\n=== Parsed User ID ===');
      console.log('Matched Event ID:', matchedEventId);
      console.log('Matched First Name:', matchedFirstName);
      console.log('Matched Last Name:', matchedLastName);

      // Now check different possible event IDs that might be sent
      const possibleEventIds = [
        '68acdfae1db767e5bab1dde4', // String format
        new mongoose.Types.ObjectId('68acdfae1db767e5bab1dde4'), // ObjectId format
      ];

      for (const testEventId of possibleEventIds) {
        console.log(`\n=== Testing Event ID: ${testEventId} (${typeof testEventId}) ===`);
        console.log('Comparison result:', matchedEventId !== testEventId.toString());
        console.log('String comparison:', matchedEventId !== testEventId.toString());
        console.log('Direct comparison:', matchedEventId !== testEventId);
        
        // Get registrations for this event
        try {
          const eventRegistrations = await mongoose.connection.db.collection('eventregistrations')
            .find({ eventId: new mongoose.Types.ObjectId(testEventId.toString()) })
            .toArray();
          
          console.log(`Found ${eventRegistrations.length} registrations for this event`);
          
          // Look for matching registration
          const matchingRegistration = eventRegistrations.find(reg => {
            const faceUserIdMatch = reg.registrationData?.faceUserId === bestMatch.userId;
            const nameMatch = reg.firstName?.toLowerCase() === matchedFirstName?.toLowerCase() && 
                            reg.lastName?.toLowerCase() === matchedLastName?.toLowerCase();
            
            return faceUserIdMatch || nameMatch;
          });
          
          if (matchingRegistration) {
            console.log('✅ Found matching registration:', {
              id: matchingRegistration._id,
              name: `${matchingRegistration.firstName} ${matchingRegistration.lastName}`,
              email: matchingRegistration.email,
              faceUserId: matchingRegistration.registrationData?.faceUserId,
              status: matchingRegistration.status
            });
          } else {
            console.log('❌ No matching registration found');
          }
          
        } catch (error) {
          console.log(`Error checking registrations:`, error.message);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();