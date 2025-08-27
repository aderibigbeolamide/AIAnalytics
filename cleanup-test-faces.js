import mongoose from 'mongoose';
import { faceRecognitionService } from './server/services/face-recognition-service.ts';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Search for all faces to see what we have
    console.log('Checking all face registrations...');
    const searchResult = await faceRecognitionService.searchFace('./uploads/face_photos_musodiq_test.jpeg', 85);
    
    if (searchResult.success && searchResult.matchFound) {
      console.log('Found face matches:');
      for (const match of searchResult.matches) {
        console.log(`- User ID: ${match.userId}, Similarity: ${match.similarity}%`);
        
        // Delete test faces that start with "test"
        if (match.userId.startsWith('test_')) {
          console.log(`Deleting test face: ${match.faceId}`);
          const deleteResult = await faceRecognitionService.deleteFace(match.faceId);
          console.log('Delete result:', deleteResult);
        }
      }
    }

    // Verify cleanup
    console.log('\nVerifying cleanup...');
    const verifyResult = await faceRecognitionService.searchFace('./uploads/face_photos_musodiq_test.jpeg', 85);
    console.log('Remaining faces after cleanup:', verifyResult.matches?.length || 0);
    
    if (verifyResult.matches) {
      verifyResult.matches.forEach(match => {
        console.log(`- Remaining: ${match.userId} (${match.similarity}% similarity)`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();