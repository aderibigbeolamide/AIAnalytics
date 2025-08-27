import mongoose from 'mongoose';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';
import fs from 'fs';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Get one of your MUSODIQ ADERIBIGBE registrations
    const yourRegistration = await mongoose.connection.db.collection('eventregistrations').findOne({
      firstName: { $regex: /MUSODIQ/i },
      lastName: { $regex: /ADERIBIGBE/i },
      eventId: new mongoose.Types.ObjectId('68acdfae1db767e5bab1dde4')
    });

    if (!yourRegistration) {
      console.log('No MUSODIQ ADERIBIGBE registration found for event 68acdfae1db767e5bab1dde4');
      process.exit(1);
    }

    console.log('Found your registration:', {
      id: yourRegistration._id,
      name: `${yourRegistration.firstName} ${yourRegistration.lastName}`,
      email: yourRegistration.email,
      eventId: yourRegistration.eventId,
      awsFaceId: yourRegistration.awsFaceId || 'Not set'
    });

    // Check if you already have a face registered
    if (yourRegistration.awsFaceId) {
      console.log('✅ You already have a face registered:', yourRegistration.awsFaceId);
      process.exit(0);
    }

    // Register your face using the test image
    const facePhotoPath = './uploads/face_photos_musodiq_test.jpeg';
    
    if (!fs.existsSync(facePhotoPath)) {
      console.log('❌ Face photo not found:', facePhotoPath);
      process.exit(1);
    }

    console.log('📸 Registering your face with AWS...');
    
    // Generate face user ID
    const faceUserId = `${yourRegistration.eventId}_${yourRegistration.firstName}_${yourRegistration.lastName}_${Date.now()}`.replace(/\s+/g, '_');
    console.log('🆔 Generated face user ID:', faceUserId);

    // Read and register the face
    const imageBuffer = fs.readFileSync(facePhotoPath);
    const registrationResult = await faceRecognitionService.registerFace(
      imageBuffer,
      faceUserId,
      {
        eventId: yourRegistration.eventId.toString(),
        firstName: yourRegistration.firstName,
        lastName: yourRegistration.lastName,
        email: yourRegistration.email,
        registrationTime: new Date().toISOString()
      }
    );

    if (!registrationResult.success) {
      console.log('❌ Face registration failed:', registrationResult.error);
      process.exit(1);
    }

    console.log('✅ Face registration successful:', {
      faceId: registrationResult.faceId,
      confidence: registrationResult.confidence
    });

    // Update your registration record
    console.log('📝 Updating database record...');
    const updateResult = await mongoose.connection.db.collection('eventregistrations').updateOne(
      { _id: yourRegistration._id },
      {
        $set: {
          awsFaceId: registrationResult.faceId,
          'registrationData.faceUserId': faceUserId,
          'registrationData.awsFaceId': registrationResult.faceId,
          faceRegistrationCompleted: true,
          faceRegistrationDate: new Date()
        }
      }
    );

    console.log('Database update result:', updateResult);

    // Test face search
    console.log('\n🔍 Testing face search...');
    const searchResult = await faceRecognitionService.searchFace(imageBuffer, 85);
    console.log('Face search results:', {
      success: searchResult.success,
      matchFound: searchResult.matchFound,
      matches: searchResult.matches?.map(m => ({
        userId: m.userId,
        similarity: Math.round(m.similarity),
        parsedEventId: m.userId.split('_')[0]
      }))
    });

    console.log('\n🎉 SUCCESS! You can now use face validation for event 68acdfae1db767e5bab1dde4');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();