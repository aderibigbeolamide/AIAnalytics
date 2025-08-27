import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');

    // Check recent members (not users)
    const recentMembers = await mongoose.connection.db.collection('members').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n=== Recent Members ===');
    recentMembers.forEach((member, index) => {
      console.log(`\n${index + 1}. Member: ${member.firstName} ${member.lastName}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Created: ${member.createdAt}`);
      console.log(`   Face Photo: ${member.facePhotoPath || 'Not uploaded'}`);
      console.log(`   Face Recognition ID: ${member.faceRecognitionId || 'Not set'}`);
      console.log(`   Member ID: ${member.memberId}`);
      console.log(`   Status: ${member.status}`);
    });

    // Check face recognition entries
    const faceRecognitions = await mongoose.connection.db.collection('facerecognitions').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n=== Face Recognition Entries ===');
    if (faceRecognitions.length === 0) {
      console.log('No face recognition entries found');
    } else {
      faceRecognitions.forEach((face, index) => {
        console.log(`\n${index + 1}. Face ID: ${face._id}`);
        console.log(`   User/Member ID: ${face.userId || face.memberId}`);
        console.log(`   Image Path: ${face.imagePath}`);
        console.log(`   AWS Face ID: ${face.awsFaceId}`);
        console.log(`   Created: ${face.createdAt}`);
      });
    }

    // Check uploaded files that match face photo pattern
    console.log('\n=== Checking Upload Directory ===');
    const fs = await import('fs');
    const files = fs.readdirSync('./uploads');
    const faceFiles = files.filter(file => file.includes('face') || file.includes('musodiq'));
    
    console.log('Face-related files found:');
    faceFiles.forEach(file => {
      const stats = fs.statSync(`./uploads/${file}`);
      console.log(`- ${file} (${Math.round(stats.size/1024)}KB) - Modified: ${stats.mtime}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();