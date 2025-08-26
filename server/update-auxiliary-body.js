import { MongoClient } from 'mongodb';

async function updateAuxiliaryBodies() {
  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('eventvalidate');
    const collection = db.collection('registrations');
    
    // Find all registrations that need auxiliary body updates
    const registrations = await collection.find({
      $or: [
        { auxiliaryBody: { $exists: false } },
        { auxiliaryBody: '' },
        { auxiliaryBody: null }
      ]
    }).toArray();
    
    console.log(`Found ${registrations.length} registrations needing auxiliary body updates`);
    
    let updatedCount = 0;
    
    for (const reg of registrations) {
      let auxiliaryBody = '';
      
      if (reg.registrationData) {
        const data = reg.registrationData;
        
        // Try to extract auxiliary body from various fields
        auxiliaryBody = data.auxiliaryBody || 
                       data.AuxiliaryBody || 
                       data.auxiliary_body ||
                       data.Gender || 
                       data.gender || 
                       data.Student || 
                       data.student ||
                       (Array.isArray(data.Gender) ? data.Gender[0] : '') ||
                       (Array.isArray(data.Student) ? data.Student[0] : '') ||
                       data.auxiliaryBodySelection ||
                       data.group ||
                       data.category ||
                       '';
      }
      
      if (auxiliaryBody && auxiliaryBody.trim()) {
        await collection.updateOne(
          { _id: reg._id },
          { 
            $set: { 
              auxiliaryBody: auxiliaryBody.trim()
            }
          }
        );
        
        updatedCount++;
        console.log(`Updated ${reg.firstName} ${reg.lastName}: "${auxiliaryBody}"`);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} registrations`);
    
  } catch (error) {
    console.error('Error updating auxiliary bodies:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

updateAuxiliaryBodies();