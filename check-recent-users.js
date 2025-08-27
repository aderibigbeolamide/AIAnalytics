import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Get the most recent users
    const recentUsers = await mongoose.connection.db.collection('users').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n=== Recent Users ===');
    recentUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.username || user.email}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Face Photo: ${user.facePhotoPath || 'Not uploaded'}`);
      console.log(`   Face Recognition ID: ${user.faceRecognitionId || 'Not set'}`);
      console.log(`   Status: ${user.status}`);
    });

    // Check for face recognition entries
    const faceRecognitions = await mongoose.connection.db.collection('facerecognitions').find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    console.log('\n=== Recent Face Recognition Entries ===');
    faceRecognitions.forEach((face, index) => {
      console.log(`\n${index + 1}. Face ID: ${face._id}`);
      console.log(`   User ID: ${face.userId}`);
      console.log(`   Image Path: ${face.imagePath}`);
      console.log(`   AWS Face ID: ${face.awsFaceId}`);
      console.log(`   Created: ${face.createdAt}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();