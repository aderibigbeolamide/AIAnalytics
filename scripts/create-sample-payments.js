import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@cluster0.mongodb.net/eventvalidate')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schemas
const eventRegistrationSchema = new mongoose.Schema({}, { strict: false });
const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);

const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema);

async function createSamplePayments() {
  try {
    // Get first few events
    const events = await Event.find().limit(3);
    console.log(`Found ${events.length} events`);
    
    if (events.length === 0) {
      console.log('No events found. Please create some events first.');
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
        createdAt: new Date(Date.now() - 86400000),
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
        createdAt: new Date(Date.now() - 172800000),
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
        createdAt: new Date(Date.now() - 259200000),
        registrationData: {
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@example.com'
        }
      }
    ];

    // Insert sample payments
    for (const paymentData of samplePayments) {
      const registration = new EventRegistration(paymentData);
      await registration.save();
      console.log(`✅ Created payment for ${paymentData.fullName} - ₦${paymentData.paymentAmount / 100}`);
    }

    const totalAmount = samplePayments.reduce((sum, payment) => sum + payment.paymentAmount, 0);
    console.log(`\n🎉 Sample payment data created successfully!`);
    console.log(`📊 Created ${samplePayments.length} paid registrations`);
    console.log(`💰 Total revenue: ₦${totalAmount / 100}`);
    
    // Verify the data was created
    const paidRegistrations = await EventRegistration.find({ paymentStatus: 'paid' });
    console.log(`\n✓ Verification: Found ${paidRegistrations.length} paid registrations in database`);
    
  } catch (error) {
    console.error('❌ Error creating sample payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createSamplePayments();