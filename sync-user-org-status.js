// Script to synchronize user statuses with their organization statuses
import { MongoStorage } from './server/mongodb-storage.js';
import mongoose from 'mongoose';

const mongoStorage = new MongoStorage();

async function syncUserOrgStatuses() {
  try {
    console.log('Starting user-organization status synchronization...');
    
    // Get all users and organizations
    const allUsers = await mongoStorage.getAllUsers();
    const allOrganizations = await mongoStorage.getOrganizations();
    
    let updatedCount = 0;
    
    for (const user of allUsers) {
      if (user.organizationId) {
        const orgId = user.organizationId.toString();
        const organization = allOrganizations.find(org => org._id.toString() === orgId);
        
        if (organization) {
          let newUserStatus = user.status;
          
          // Determine new user status based on organization status
          if (organization.status === 'approved' && user.status === 'pending_approval') {
            newUserStatus = 'active';
          } else if (organization.status === 'rejected' && user.status === 'pending_approval') {
            newUserStatus = 'suspended';
          }
          
          // Update user if status needs to change
          if (newUserStatus !== user.status) {
            console.log(`Updating user ${user.username} (${user.email}) from '${user.status}' to '${newUserStatus}' based on org '${organization.name}' status: ${organization.status}`);
            
            await mongoStorage.updateUser(user._id.toString(), { status: newUserStatus });
            updatedCount++;
          }
        }
      }
    }
    
    console.log(`Synchronization complete. Updated ${updatedCount} user(s).`);
    
  } catch (error) {
    console.error('Error synchronizing user-organization statuses:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the sync
syncUserOrgStatuses();