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
      organizationId: event.organizationId?.toString()
    };
  }

  /**
   * Get organization events
   */
  static async getOrganizationEvents(filters: any = {}) {
    const events = await mongoStorage.getEvents(filters);
    
    return events.map(event => ({
      id: event._id?.toString(),
      ...event
    }));
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
  static async createEvent(userId: string, eventData: any, file?: any) {
    let finalEventData = {
      ...eventData,
      createdBy: userId,
      qrCode: nanoid(8),
      status: 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Handle file upload if provided
    if (file) {
      try {
        const { fileStorage } = await import('../storage-handler');
        const uploadedFile = await fileStorage.saveFile(file, 'event-images');
        finalEventData.eventImage = uploadedFile.url;
        console.log('DEBUG: File uploaded successfully:', uploadedFile.url);
      } catch (error) {
        console.error('Error uploading event image:', error);
        // Continue without image if upload fails
      }
    }

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