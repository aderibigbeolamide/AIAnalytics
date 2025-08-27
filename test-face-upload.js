import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Check if we can find any recent member registration today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysMembers = await mongoose.connection.db.collection('members').find({
      createdAt: { $gte: today }
    }).toArray();

    console.log('\n=== Today\'s Member Registrations ===');
    console.log(`Found ${todaysMembers.length} registrations today`);

    todaysMembers.forEach((member, index) => {
      console.log(`\n${index + 1}. Member: ${member.firstName} ${member.lastName}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Created: ${member.createdAt}`);
      console.log(`   Face Photo: ${member.facePhotoPath || 'Not uploaded'}`);
      console.log(`   Face Recognition ID: ${member.faceRecognitionId || 'Not set'}`);
    });

    // Check if there are any face recognition entries at all
    const allFaceRecognitions = await mongoose.connection.db.collection('facerecognitions').find({}).toArray();
    console.log(`\n=== Total Face Recognition Entries in Database: ${allFaceRecognitions.length} ===`);

    // Check all collections to understand the structure
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== Available Collections ===');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();