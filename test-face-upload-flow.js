import mongoose from 'mongoose';
import fs from 'fs';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Check the existing face photo
    const facePhotoPath = './uploads/face_photos_musodiq_test.jpeg';
    
    if (!fs.existsSync(facePhotoPath)) {
      console.log('❌ Face photo file not found:', facePhotoPath);
      process.exit(1);
    }

    console.log('✅ Face photo file exists:', facePhotoPath);
    const stats = fs.statSync(facePhotoPath);
    console.log(`📁 File size: ${Math.round(stats.size/1024)}KB`);

    // Test the face recognition service status
    console.log('\n=== Testing Face Recognition Service ===');
    const serviceStatus = faceRecognitionService.getStatus();
    console.log('🔧 Service Status:', serviceStatus);

    if (!serviceStatus.configured) {
      console.log('❌ AWS Face Recognition is not configured');
      process.exit(1);
    }

    // Test image validation
    console.log('\n=== Testing Image Validation ===');
    const imageBuffer = fs.readFileSync(facePhotoPath);
    const validation = await faceRecognitionService.validateImage(imageBuffer);
    console.log('🔍 Image Validation Result:', validation);

    if (!validation.success) {
      console.log('❌ Image validation failed:', validation.error);
      process.exit(1);
    }

    // Test face registration
    console.log('\n=== Testing Face Registration ===');
    const testUserId = `test_musodiq_${Date.now()}`;
    console.log('🆔 Test User ID:', testUserId);

    const registrationResult = await faceRecognitionService.registerFace(
      imageBuffer,
      testUserId,
      {
        eventId: 'test_event',
        firstName: 'Musodiq',
        lastName: 'Test',
        email: 'musodiq@test.com',
        registrationTime: new Date().toISOString()
      }
    );

    console.log('📊 Face Registration Result:', registrationResult);

    if (registrationResult.success) {
      console.log('✅ Face registered successfully!');
      console.log(`   Face ID: ${registrationResult.faceId}`);
      console.log(`   Confidence: ${registrationResult.confidence}%`);
      
      // Test face search
      console.log('\n=== Testing Face Search ===');
      const searchResult = await faceRecognitionService.searchFace(imageBuffer, 85);
      console.log('🔍 Face Search Result:', searchResult);
      
      if (searchResult.success && searchResult.matchFound) {
        console.log('✅ Face search successful!');
        console.log(`   Matches found: ${searchResult.matches.length}`);
        searchResult.matches.forEach((match, index) => {
          console.log(`   Match ${index + 1}: ${match.userId} (${Math.round(match.similarity)}% similarity)`);
        });
      }
    } else {
      console.log('❌ Face registration failed:', registrationResult.error);
    }

    process.exit(0);
  } catch (error) {
    console.error('💥 Error during testing:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

connectDB();