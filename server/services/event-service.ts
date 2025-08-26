import { mongoStorage } from "../mongodb-storage";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

export class EventService {
  /**
   * Get public events (no authentication required)
   */
  static async getPublicEvents() {
    const events = await mongoStorage.getEvents();
    
    return events
      .filter(event => ['upcoming', 'active'].includes(event.status))
      .map(event => ({
        id: event._id?.toString(),
        name: event.name,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        registrationStartDate: event.registrationStartDate,
        registrationEndDate: event.registrationEndDate,
        status: event.status,
        maxAttendees: event.maxAttendees,
        eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
        allowGuests: event.allowGuests,
        allowInvitees: event.allowInvitees,
        eventType: event.eventType,
        eventImage: event.eventImage,
        ticketCategories: event.ticketCategories || [],
        customRegistrationFields: event.customRegistrationFields,
        paymentSettings: event.paymentSettings,
        faceRecognitionSettings: event.faceRecognitionSettings,
        organizationId: event.organizationId?.toString()
      }));
  }

  /**
   * Get public event by ID
   */
  static async getPublicEventById(eventId: string) {
    const event = await mongoStorage.getEvent(eventId);
    
    if (!event || !['upcoming', 'active'].includes(event.status)) {
      return null;
    }

    return {
      id: event._id?.toString(),
      name: event.name,
      description: event.description,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationStartDate: event.registrationStartDate,
      registrationEndDate: event.registrationEndDate,
      status: event.status,
      maxAttendees: event.maxAttendees,
      eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
      allowGuests: event.allowGuests,
      allowInvitees: event.allowInvitees,
      eventType: event.eventType,
      eventImage: event.eventImage,
      ticketCategories: event.ticketCategories || [],
      customRegistrationFields: event.customRegistrationFields,
      paymentSettings: event.paymentSettings,
      faceRecognitionSettings: event.faceRecognitionSettings,
      organizationId: event.organizationId?.toString()
    };
  }

  /**
   * Get organization events with registration statistics
   */
  static async getOrganizationEvents(filters: any = {}) {
    const events = await mongoStorage.getEvents(filters);
    
    // Enrich events with registration statistics
    const enrichedEvents = await Promise.all(events.map(async (event) => {
      try {
        // Get registration statistics for this event
        const registrations = await mongoStorage.getEventRegistrations(event._id?.toString());
        
        const totalRegistrations = registrations.length;
        const memberRegistrations = registrations.filter(r => r.memberType === 'member').length;
        const guestRegistrations = registrations.filter(r => r.memberType === 'guest').length;
        const inviteeRegistrations = registrations.filter(r => r.memberType === 'invitee').length;
        
        // Calculate attendance rate
        const attendedRegistrations = registrations.filter(r => r.attendance?.attended === true).length;
        const attendanceRate = totalRegistrations > 0 ? Math.round((attendedRegistrations / totalRegistrations) * 100) : 0;
        
        return {
          id: (event._id as any)?.toString(),
          name: event.name,
          description: event.description,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          registrationStartDate: event.registrationStartDate,
          registrationEndDate: event.registrationEndDate,
          status: event.status,
          eventType: event.eventType,
          maxAttendees: event.maxAttendees,
          eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
          allowGuests: event.allowGuests,
          allowInvitees: event.allowInvitees,
          eventImage: event.eventImage,
          ticketCategories: event.ticketCategories || [],
          customRegistrationFields: event.customRegistrationFields,
          paymentSettings: event.paymentSettings,
          organizationId: (event.organizationId as any)?.toString(),
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          // Add statistics
          totalRegistrations,
          memberRegistrations,
          guestRegistrations,
          inviteeRegistrations,
          attendanceRate,
          attendedCount: attendedRegistrations,
          qrCode: event.qrCode
        };
      } catch (error) {
        console.error(`Error enriching event ${event._id}:`, error);
        // Return basic event data if enrichment fails
        return {
          id: (event._id as any)?.toString(),
          name: event.name || 'Unnamed Event',
          description: event.description || '',
          location: event.location || 'TBD',
          startDate: event.startDate,
          endDate: event.endDate,
          registrationStartDate: event.registrationStartDate,
          registrationEndDate: event.registrationEndDate,
          status: event.status || 'active',
          eventType: event.eventType || 'registration',
          maxAttendees: event.maxAttendees,
          eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies || [],
          allowGuests: event.allowGuests || false,
          allowInvitees: event.allowInvitees || false,
          eventImage: event.eventImage,
          ticketCategories: event.ticketCategories || [],
          customRegistrationFields: event.customRegistrationFields || [],
          paymentSettings: event.paymentSettings,
          organizationId: (event.organizationId as any)?.toString(),
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          totalRegistrations: 0,
          memberRegistrations: 0,
          guestRegistrations: 0,
          inviteeRegistrations: 0,
          attendanceRate: 0,
          attendedCount: 0,
          qrCode: event.qrCode
        };
      }
    }));
    
    return enrichedEvents;
  }

  /**
   * Get event by ID with user context
   */
  static async getEventById(eventId: string, user: any) {
    const event = await mongoStorage.getEvent(eventId);
    
    if (!event) {
      return null;
    }

    // Check access permissions
    if (user.role !== 'super_admin' && event.organizationId?.toString() !== user.organizationId) {
      return null;
    }

    return {
      id: event._id?.toString(),
      ...event
    };
  }

  /**
   * Create a new event
   */
  static async createEvent(userId: string, eventData: any) {
    const finalEventData = {
      ...eventData,
      createdBy: userId,
      qrCode: nanoid(8),
      status: 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const event = await mongoStorage.createEvent(finalEventData);

    return {
      id: event._id?.toString(),
      ...event
    };
  }

  /**
   * Update an event
   */
  static async updateEvent(eventId: string, updateData: any, user: any, file?: any) {
    const updatedEvent = await mongoStorage.updateEvent(eventId, {
      ...updateData,
      updatedAt: new Date()
    });

    return {
      id: updatedEvent._id?.toString(),
      ...updatedEvent
    };
  }

  /**
   * Delete an event (soft delete)
   */
  static async deleteEvent(eventId: string, user: any) {
    return await mongoStorage.updateEvent(eventId, {
      deletedAt: new Date(),
      status: 'cancelled'
    });
  }

  /**
   * Generate QR code for event
   */
  static async generateEventQRCode(eventId: string, data: string): Promise<string> {
    try {
      const qrCode = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCode;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Get event statistics
   */
  static async getEventStatistics(eventId: string) {
    const registrations = await mongoStorage.getEventRegistrations(eventId);
    
    const stats = {
      totalRegistrations: registrations.length,
      attendedCount: registrations.filter(r => r.status === 'attended').length,
      onlineCount: registrations.filter(r => r.status === 'online').length,
      registeredCount: registrations.filter(r => r.status === 'registered').length,
      cancelledCount: registrations.filter(r => r.status === 'cancelled').length,
      memberRegistrations: registrations.filter(r => r.registrationType === 'member').length,
      guestRegistrations: registrations.filter(r => r.registrationType === 'guest').length,
      inviteeRegistrations: registrations.filter(r => r.registrationType === 'invitee').length
    };

    return stats;
  }
}