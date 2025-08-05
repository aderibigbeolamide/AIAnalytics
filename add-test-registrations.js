// Simple script to add test registrations using the same MongoDB connection as the app
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Event, EventRegistration, Ticket } from './shared/mongoose-schema';

dotenv.config();

async function addTestRegistrations() {
  try {
    // Use the same connection as the main app
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hafiztech56:eventdb@eventdb.b5av4hv.mongodb.net/eventvalidate?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Get all events
    const events = await Event.find();
    console.log(`Found ${events.length} events`);

    for (const event of events) {
      console.log(`Processing event: ${event.name} (${event.eventType})`);
      
      // Check if event already has registrations/tickets
      const existingRegistrations = await EventRegistration.find({ eventId: event._id });
      const existingTickets = await Ticket.find({ eventId: event._id });
      
      if (existingRegistrations.length > 0 || existingTickets.length > 0) {
        console.log(`  - Event already has ${existingRegistrations.length} registrations and ${existingTickets.length} tickets`);
        continue;
      }

      if (event.eventType === 'ticket') {
        // Create test tickets for ticket-based events
        const tickets = [
          {
            eventId: event._id,
            ticketNumber: `TKT-${Date.now()}-1`,
            ownerName: 'John Doe',
            ownerEmail: 'john@example.com',
            category: 'Standard',
            price: 5000,
            currency: 'NGN',
            paymentStatus: 'paid',
            status: 'active'
          },
          {
            eventId: event._id,
            ticketNumber: `TKT-${Date.now()}-2`,
            ownerName: 'Jane Smith',
            ownerEmail: 'jane@example.com',
            category: 'Standard',
            price: 5000,
            currency: 'NGN',
            paymentStatus: 'paid',
            status: 'active'
          },
          {
            eventId: event._id,
            ticketNumber: `TKT-${Date.now()}-3`,
            ownerName: 'Bob Wilson',
            ownerEmail: 'bob@example.com',
            category: 'Standard',
            price: 5000,
            currency: 'NGN',
            paymentStatus: 'pending',
            status: 'active'
          }
        ];

        await Ticket.insertMany(tickets);
        console.log(`  - Created ${tickets.length} tickets`);
      } else {
        // Create test registrations for registration-based events
        const registrations = [
          {
            eventId: event._id,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            registrationType: 'member',
            status: 'registered',
            auxiliaryBody: 'General'
          },
          {
            eventId: event._id,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            registrationType: 'member',
            status: 'attended',
            auxiliaryBody: 'General'
          },
          {
            eventId: event._id,
            firstName: 'Bob',
            lastName: 'Wilson',
            email: 'bob@example.com',
            registrationType: 'guest',
            status: 'registered',
            auxiliaryBody: 'General'
          },
          {
            eventId: event._id,
            firstName: 'Alice',
            lastName: 'Brown',
            email: 'alice@example.com',
            registrationType: 'invitee',
            status: 'registered',
            auxiliaryBody: 'General'
          }
        ];

        await EventRegistration.insertMany(registrations);
        console.log(`  - Created ${registrations.length} registrations`);
      }
    }

    console.log('Test data creation completed!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addTestRegistrations();