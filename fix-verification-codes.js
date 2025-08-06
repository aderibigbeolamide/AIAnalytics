import { MongoClient } from 'mongodb';

// Use MongoDB Atlas connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://musodiq9960:IUZy2jGxwqQ2lqj1@cluster0.f2o2iqt.mongodb.net/eventvalidate';

async function addMissingVerificationCodes() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Find registrations missing verification codes
    const registrations = await db.collection('eventregistrations').find({
      $or: [
        { manualVerificationCode: { $exists: false } },
        { manualVerificationCode: null },
        { 'registrationData.manualVerificationCode': { $exists: false } },
        { 'registrationData.manualVerificationCode': null }
      ]
    }).toArray();
    
    console.log(`Found ${registrations.length} registrations missing verification codes`);
    
    for (const reg of registrations) {
      // Generate verification code based on event type
      let verificationCode;
      
      // Try to find the event to determine if it's ticket-based
      const event = await db.collection('events').findOne({ _id: reg.eventId });
      const isTicketEvent = event?.eventType === 'ticketed';
      
      if (isTicketEvent) {
        // Numeric codes for ticket events
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      } else {
        // Alphabetic codes for registration events  
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        verificationCode = Array.from({length: 6}, () => chars[Math.floor(Math.random() * 26)]).join('');
      }
      
      // Update both root level and nested level
      await db.collection('eventregistrations').updateOne(
        { _id: reg._id },
        { 
          $set: { 
            manualVerificationCode: verificationCode,
            'registrationData.manualVerificationCode': verificationCode
          }
        }
      );
      
      console.log(`Added code ${verificationCode} for ${reg.firstName} ${reg.lastName} (Event: ${event?.name || 'Unknown'})`);
    }
    
    console.log('Manual verification codes added successfully');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

addMissingVerificationCodes();