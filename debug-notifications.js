// Debug script to check notification system
import mongoose from 'mongoose';
import { User, Organization, Notification } from './shared/mongoose-schema.js';

async function debugNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://hafiztech56:eventdb@eventdb.b5av4hv.mongodb.net/eventvalidate');
    console.log('Connected to MongoDB');

    console.log('\n=== USERS ===');
    const users = await User.find({});
    users.forEach(user => {
      console.log(`ID: ${user._id}, Username: ${user.username}, Role: ${user.role}, OrgID: ${user.organizationId}`);
    });

    console.log('\n=== ORGANIZATIONS ===');
    const orgs = await Organization.find({});
    orgs.forEach(org => {
      console.log(`ID: ${org._id}, Name: ${org.name}, Status: ${org.status}`);
    });

    console.log('\n=== NOTIFICATIONS ===');
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    notifications.forEach(notif => {
      console.log(`ID: ${notif._id}, Recipient: ${notif.recipientId}, Type: ${notif.type}, Title: ${notif.title}`);
    });

    // Find the admin user and check their organization
    const adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      console.log('\n=== ADMIN USER ===');
      console.log(`Admin User ID: ${adminUser._id}`);
      console.log(`Admin Organization ID: ${adminUser.organizationId}`);
      
      if (adminUser.organizationId) {
        const org = await Organization.findById(adminUser.organizationId);
        console.log(`Admin's Organization: ${org ? org.name : 'NOT FOUND'}`);
      } else {
        console.log('Admin has no organization ID set!');
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugNotifications();