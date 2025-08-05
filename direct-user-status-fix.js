// Direct MongoDB update to fix user statuses
import mongoose from 'mongoose';
import { User, Organization } from './shared/mongoose-schema.js';

async function fixUserStatuses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventvalidate', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Get all users with pending_approval status
    const pendingUsers = await User.find({ status: 'pending_approval' }).populate('organizationId');
    
    console.log(`Found ${pendingUsers.length} users with pending_approval status`);
    
    for (const user of pendingUsers) {
      if (user.organizationId) {
        const org = user.organizationId;
        let newStatus = 'pending_approval';
        
        if (org.status === 'approved') {
          newStatus = 'active';
        } else if (org.status === 'rejected') {
          newStatus = 'suspended';
        }
        
        if (newStatus !== user.status) {
          console.log(`Updating ${user.username} from ${user.status} to ${newStatus} (org: ${org.name} - ${org.status})`);
          
          await User.updateOne(
            { _id: user._id },
            { $set: { status: newStatus } }
          );
          
          console.log(`✓ Updated ${user.username}`);
        }
      }
    }
    
    console.log('User status sync complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixUserStatuses();