// Script to create test data for events to populate statistics
import mongoose from 'mongoose';

// Connect to MongoDB (use the same connection string as the app)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eventvalidate';

// Import schemas (we'll create simple ones here for this script)
const eventRegistrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
  registrationType: { type: String, enum: ['member', 'guest', 'invitee'], required: true },
  userId: mongoose.Schema.Types.ObjectId,
  firstName: String,
  lastName: String,
  email: String,
  status: { type: String, default: 'registered' },
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ticketNumber: { type: String, required: true, unique: true },
  ownerName: String,
  ownerEmail: String,
  category: String,
  price: Number,
  currency: { type: String, default: 'NGN' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  status: { type: String, enum: ['active', 'used', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);

async function createTestData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the "NonPayment Test" event ID
    const Event = mongoose.model('Event');
    const event = await Event.findOne({ name: 'NonPayment Test' });
    
    if (!event) {
      console.log('NonPayment Test event not found');
      return;
    }

    console.log('Found event:', event.name, 'ID:', event._id);

    // Determine if it's a ticket or registration based event
    if (event.eventType === 'ticket') {
      console.log('Creating test tickets...');
      
      // Create test tickets with different payment statuses
      const tickets = [
        { eventId: event._id, ticketNumber: 'TKT001', ownerName: 'John Doe', ownerEmail: 'john@example.com', paymentStatus: 'completed', price: 5000 },
        { eventId: event._id, ticketNumber: 'TKT002', ownerName: 'Jane Smith', ownerEmail: 'jane@example.com', paymentStatus: 'completed', price: 5000 },
        { eventId: event._id, ticketNumber: 'TKT003', ownerName: 'Bob Wilson', ownerEmail: 'bob@example.com', paymentStatus: 'pending', price: 5000 },
        { eventId: event._id, ticketNumber: 'TKT004', ownerName: 'Alice Brown', ownerEmail: 'alice@example.com', paymentStatus: 'failed', price: 5000 }
      ];
      
      await Ticket.insertMany(tickets);
      console.log('Created', tickets.length, 'test tickets');
    } else {
      console.log('Creating test registrations...');
      
      // Create test registrations with different types
      const registrations = [
        { eventId: event._id, registrationType: 'member', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { eventId: event._id, registrationType: 'member', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        { eventId: event._id, registrationType: 'guest', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com' },
        { eventId: event._id, registrationType: 'invitee', firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com' }
      ];
      
      await EventRegistration.insertMany(registrations);
      console.log('Created', registrations.length, 'test registrations');
    }
    
    console.log('Test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestData();