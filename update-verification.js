import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://eventvalidate:nZUnj2Rn9E8PPHgs@cluster0.lxf6ywp.mongodb.net/eventvalidate';

async function updateVerificationCode() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Update the first registration with a simple verification code
    const result = await mongoose.connection.db.collection('eventregistrations').updateOne(
      { uniqueId: 'MEMBER_1754175181834_R7O2JX' },
      { 
        $set: { 
          'registrationData.manualVerificationCode': '123456'
        }
      }
    );
    
    console.log('Update result:', result);
    
    if (result.modifiedCount > 0) {
      console.log('Successfully added verification code 123456 to muyideen jimoh registration');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateVerificationCode();
