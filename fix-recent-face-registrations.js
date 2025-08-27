import mongoose from 'mongoose';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Get the most recent registration with a face photo
    const recentRegistration = await mongoose.connection.db.collection('eventregistrations').findOne({
      facePhotoPath: { $exists: true, $ne: null },
      awsFaceId: { $exists: false }
    }, { sort: { createdAt: -1 } });

    if (!recentRegistration) {
      console.log('No recent registration with face photo found');
      process.exit(0);
    }

    console.log('Processing registration:', {
      name: `${recentRegistration.firstName} ${recentRegistration.lastName}`,
      email: recentRegistration.email,
      eventId: recentRegistration.eventId,
      facePhotoPath: recentRegistration.facePhotoPath
    });

    // Download the image from Cloudinary
    console.log('Downloading image from Cloudinary...');
    const imageResponse = await axios.get(recentRegistration.facePhotoPath, {
      responseType: 'arraybuffer'
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    console.log(`Image downloaded: ${Math.round(imageBuffer.length/1024)}KB`);

    // Validate the image
    console.log('Validating image...');
    const validation = await faceRecognitionService.validateImage(imageBuffer);
    if (!validation.success) {
      console.log('Image validation failed:', validation.error);
      process.exit(1);
    }
    console.log('Image validation passed with confidence:', validation.faceDetails.confidence);

    // Generate face user ID in the correct format
    const faceUserId = `${recentRegistration.eventId}_${recentRegistration.firstName}_${recentRegistration.lastName}_${Date.now()}`.replace(/\s+/g, '_');
    console.log('Generated faceUserId:', faceUserId);

    // Register the face with AWS
    console.log('Registering face with AWS...');
    const registrationResult = await faceRecognitionService.registerFace(
      imageBuffer,
      faceUserId,
      {
        eventId: recentRegistration.eventId,
        firstName: recentRegistration.firstName,
        lastName: recentRegistration.lastName,
        email: recentRegistration.email,
        registrationTime: new Date().toISOString()
      }
    );

    if (!registrationResult.success) {
      console.log('Face registration failed:', registrationResult.error);
      process.exit(1);
    }

    console.log('Face registration successful:', {
      faceId: registrationResult.faceId,
      confidence: registrationResult.confidence
    });

    // Update the database record
    console.log('Updating database record...');
    const updateResult = await mongoose.connection.db.collection('eventregistrations').updateOne(
      { _id: recentRegistration._id },
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

    // Test the face search now
    console.log('\nTesting face validation...');
    const searchResult = await faceRecognitionService.searchFace(imageBuffer, 85);
    console.log('Face search result:', {
      success: searchResult.success,
      matchFound: searchResult.matchFound,
      matches: searchResult.matches?.map(m => ({
        userId: m.userId,
        similarity: m.similarity,
        eventId: m.userId.split('_')[0]
      }))
    });

    console.log('\n✅ Face registration completed successfully!');
    console.log(`Now the user "${recentRegistration.firstName} ${recentRegistration.lastName}" can use face validation for event "${recentRegistration.eventId}"`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();