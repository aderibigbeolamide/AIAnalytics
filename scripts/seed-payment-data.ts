import mongoose from 'mongoose';
import { config } from 'dotenv';
import { EventRegistration } from '../shared/mongoose-schema';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventvalidate';

async function seedPaymentData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get existing events to associate payments with
    const Event = mongoose.model('Event');
    const events = await Event.find().limit(3);
    
    if (events.length === 0) {
      console.log('No events found. Please create events first.');
      return;
    }

    // Create sample paid registrations
    const samplePayments = [
      {
        eventId: events[0]._id,
        registrationType: 'guest',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        auxiliaryBody: 'General',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentAmount: 5000, // ₦50.00
        paymentCurrency: 'NGN',
        paymentMethod: 'paystack',
        paymentReference: `pay_${Math.random().toString(36).substr(2, 9)}`,
        paymentVerifiedAt: new Date(Date.now() - 86400000), // 1 day ago
        uniqueId: `REG_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        registrationData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        }
      },
      {
        eventId: events[0]._id,
        registrationType: 'member',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        auxiliaryBody: 'Technical Committee',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentAmount: 3000, // ₦30.00
        paymentCurrency: 'NGN',
        paymentMethod: 'paystack',
        paymentReference: `pay_${Math.random().toString(36).substr(2, 9)}`,
        paymentVerifiedAt: new Date(Date.now() - 172800000), // 2 days ago
        uniqueId: `REG_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        registrationData: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com'
        }
      },
      {
        eventId: events.length > 1 ? events[1]._id : events[0]._id,
        registrationType: 'guest',
        email: 'mike.johnson@example.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        fullName: 'Mike Johnson',
        auxiliaryBody: 'Marketing',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentAmount: 7500, // ₦75.00
        paymentCurrency: 'NGN',
        paymentMethod: 'paystack',
        paymentReference: `pay_${Math.random().toString(36).substr(2, 9)}`,
        paymentVerifiedAt: new Date(Date.now() - 259200000), // 3 days ago
        uniqueId: `REG_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        registrationData: {
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@example.com'
        }
      },
      {
        eventId: events.length > 2 ? events[2]._id : events[0]._id,
        registrationType: 'invitee',
        email: 'sarah.wilson@example.com',
        firstName: 'Sarah',
        lastName: 'Wilson',
        fullName: 'Sarah Wilson',
        auxiliaryBody: 'Special Guests',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentAmount: 10000, // ₦100.00
        paymentCurrency: 'NGN',
        paymentMethod: 'paystack',
        paymentReference: `pay_${Math.random().toString(36).substr(2, 9)}`,
        paymentVerifiedAt: new Date(Date.now() - 345600000), // 4 days ago
        uniqueId: `REG_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        registrationData: {
          firstName: 'Sarah',
          lastName: 'Wilson',
          email: 'sarah.wilson@example.com'
        }
      },
      {
        eventId: events[0]._id,
        registrationType: 'member',
        email: 'david.brown@example.com',
        firstName: 'David',
        lastName: 'Brown',
        fullName: 'David Brown',
        auxiliaryBody: 'Finance Committee',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentAmount: 4500, // ₦45.00
        paymentCurrency: 'NGN',
        paymentMethod: 'paystack',
        paymentReference: `pay_${Math.random().toString(36).substr(2, 9)}`,
        paymentVerifiedAt: new Date(Date.now() - 432000000), // 5 days ago
        uniqueId: `REG_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        registrationData: {
          firstName: 'David',
          lastName: 'Brown',
          email: 'david.brown@example.com'
        }
      }
    ];

    // Insert sample payment data
    for (const paymentData of samplePayments) {
      await EventRegistration.create(paymentData);
      console.log(`Created payment for ${paymentData.fullName} - ₦${paymentData.paymentAmount / 100}`);
    }

    console.log('✅ Sample payment data seeded successfully!');
    console.log(`Created ${samplePayments.length} paid registrations`);
    
    // Display summary
    const totalAmount = samplePayments.reduce((sum, payment) => sum + payment.paymentAmount, 0);
    console.log(`Total revenue from sample data: ₦${totalAmount / 100}`);
    
  } catch (error) {
    console.error('Error seeding payment data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedPaymentData();