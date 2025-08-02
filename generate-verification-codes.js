import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventvalidate';

async function generateVerificationCodes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const registrations = db.collection('eventregistrations');
    
    // Get all registrations without verification codes
    const allRegs = await registrations.find({
      'registrationData.manualVerificationCode': { $exists: false }
    }).toArray();
    
    console.log(`Found ${allRegs.length} registrations without verification codes`);
    
    // Generate verification codes for each registration
    for (const reg of allRegs) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await registrations.updateOne(
        { _id: reg._id },
        {
          $set: {
            'registrationData.manualVerificationCode': verificationCode
          }
        }
      );
      
      console.log(`Generated code ${verificationCode} for ${reg.firstName} ${reg.lastName}`);
    }
    
    console.log('Verification codes generated successfully');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

generateVerificationCodes();