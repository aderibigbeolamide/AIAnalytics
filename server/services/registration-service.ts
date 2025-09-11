import { mongoStorage } from "../mongodb-storage";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

export class RegistrationService {
  /**
   * Create event registration
   */
  static async createRegistration(eventId: string, registrationData: any) {
    const uniqueId = nanoid(6).toUpperCase();
    const qrCodeData = JSON.stringify({
      eventId,
      registrationId: uniqueId, // Keep for backward compatibility
      uniqueId, // Add explicit uniqueId field
      timestamp: Date.now()
    });
    
    const qrCode = await QRCode.toDataURL(qrCodeData);
    
    const registration = await mongoStorage.createEventRegistration({
      eventId,
      ...registrationData,
      qrCode: qrCodeData,
      uniqueId,
      status: 'registered',
      createdAt: new Date()
    });

    return {
      id: registration._id?.toString(),
      eventId: registration.eventId?.toString(),
      memberId: registration.memberId?.toString(),
      registrationType: registration.registrationType || 'member',
      firstName: registration.firstName || 'Guest',
      lastName: registration.lastName || '',
      email: registration.email,
      phoneNumber: registration.phoneNumber,
      auxiliaryBody: registration.auxiliaryBody || '—',
      qrCode: registration.qrCode,
      uniqueId: registration.uniqueId,
      status: registration.status,
      registrationData: registration.registrationData,
      paymentStatus: registration.paymentStatus,
      paymentReference: registration.paymentReference,
      paymentMethod: registration.paymentMethod,
      paymentAmount: registration.paymentAmount,
      ticketNumber: registration.ticketNumber,
      validatedAt: registration.validatedAt,
      validatedBy: registration.validatedBy?.toString(),
      facePhotoPath: registration.facePhotoPath,
      receiptPath: registration.receiptPath,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
      qrCodeImage: qrCode
    };
  }

  /**
   * Get registration by ID
   */
  static async getRegistrationById(registrationId: string) {
    const registration = await mongoStorage.getEventRegistration(registrationId);
    
    if (!registration) {
      return null;
    }

    return {
      id: registration._id?.toString(),
      eventId: registration.eventId?.toString(),
      memberId: registration.memberId?.toString(),
      registrationType: registration.registrationType || 'member',
      firstName: registration.firstName || 'Guest',
      lastName: registration.lastName || '',
      email: registration.email,
      phoneNumber: registration.phoneNumber,
      auxiliaryBody: registration.auxiliaryBody || '—',
      qrCode: registration.qrCode,
      uniqueId: registration.uniqueId,
      status: registration.status,
      registrationData: registration.registrationData,
      paymentStatus: registration.paymentStatus,
      paymentReference: registration.paymentReference,
      paymentMethod: registration.paymentMethod,
      paymentAmount: registration.paymentAmount,
      ticketNumber: registration.ticketNumber,
      validatedAt: registration.validatedAt,
      validatedBy: registration.validatedBy?.toString(),
      facePhotoPath: registration.facePhotoPath,
      receiptPath: registration.receiptPath,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt
    };
  }

  /**
   * Get registration by unique ID
   */
  static async getRegistrationByUniqueId(uniqueId: string) {
    const registration = await mongoStorage.getEventRegistrationByUniqueId(uniqueId);
    
    if (!registration) {
      return null;
    }

    return {
      id: registration._id?.toString(),
      eventId: registration.eventId?.toString(),
      memberId: registration.memberId?.toString(),
      registrationType: registration.registrationType || 'member',
      firstName: registration.firstName || 'Guest',
      lastName: registration.lastName || '',
      email: registration.email,
      phoneNumber: registration.phoneNumber,
      auxiliaryBody: registration.auxiliaryBody || '—',
      qrCode: registration.qrCode,
      uniqueId: registration.uniqueId,
      status: registration.status,
      registrationData: registration.registrationData,
      paymentStatus: registration.paymentStatus,
      paymentReference: registration.paymentReference,
      paymentMethod: registration.paymentMethod,
      paymentAmount: registration.paymentAmount,
      ticketNumber: registration.ticketNumber,
      validatedAt: registration.validatedAt,
      validatedBy: registration.validatedBy?.toString(),
      facePhotoPath: registration.facePhotoPath,
      receiptPath: registration.receiptPath,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt
    };
  }

  /**
   * Get registration by QR code
   */
  static async getRegistrationByQRCode(qrCode: string) {
    try {
      console.log('🔍 QR validation - parsing QR code:', qrCode);
      const qrData = JSON.parse(qrCode);
      console.log('🔍 QR validation - parsed data:', qrData);
      
      // Try to find registration - registrationId in QR actually contains uniqueId
      let registration = null;
      
      // First try by uniqueId (most common case)
      if (qrData.uniqueId) {
        console.log('🔍 QR validation - looking up by explicit uniqueId:', qrData.uniqueId);
        registration = await mongoStorage.getEventRegistrationByUniqueId(qrData.uniqueId);
      }
      
      // If not found and registrationId exists, try it as uniqueId (backward compatibility)
      if (!registration && qrData.registrationId) {
        console.log('🔍 QR validation - looking up by registrationId as uniqueId:', qrData.registrationId);
        registration = await mongoStorage.getEventRegistrationByUniqueId(qrData.registrationId);
      }
      
      // Last resort: try registrationId as MongoDB _id (legacy support)
      if (!registration && qrData.registrationId) {
        console.log('🔍 QR validation - looking up by registrationId as MongoDB _id:', qrData.registrationId);
        registration = await mongoStorage.getEventRegistration(qrData.registrationId);
      }
      
      if (!registration) {
        console.log('❌ QR validation - no registration found');
        return null;
      }

      console.log('✅ QR validation - registration found:', registration._id);
      return {
        id: registration._id?.toString(),
        ...registration
      };
    } catch (error) {
      console.error('❌ Error parsing QR code:', error);
      return null;
    }
  }

  /**
   * Validate registration attendance
   */
  static async validateAttendance(registrationId: string, validationMethod: string) {
    const registration = await mongoStorage.updateEventRegistration(registrationId, {
      status: 'attended'
    });

    if (!registration) {
      throw new Error('Registration not found');
    }

    return {
      id: registration._id?.toString(),
      ...registration
    };
  }

  /**
   * Update registration status
   */
  static async updateRegistrationStatus(registrationId: string, status: string) {
    const registration = await mongoStorage.updateEventRegistration(registrationId, {
      status,
      updatedAt: new Date()
    });

    if (!registration) {
      throw new Error('Registration not found');
    }

    return {
      id: registration._id?.toString(),
      ...registration
    };
  }

  /**
   * Get registrations for an event
   */
  static async getEventRegistrations(eventId: string, filters: any = {}) {
    const registrations = await mongoStorage.getEventRegistrations(eventId, filters);
    
    return registrations.map(registration => ({
      id: registration._id?.toString(),
      eventId: registration.eventId?.toString(),
      memberId: registration.memberId?.toString(),
      registrationType: registration.registrationType || 'member',
      firstName: registration.firstName || 'Guest',
      lastName: registration.lastName || '',
      email: registration.email,
      phoneNumber: registration.phoneNumber,
      auxiliaryBody: registration.auxiliaryBody || '—',
      qrCode: registration.qrCode,
      uniqueId: registration.uniqueId,
      status: registration.status,
      registrationData: registration.registrationData,
      paymentStatus: registration.paymentStatus,
      paymentReference: registration.paymentReference,
      paymentMethod: registration.paymentMethod,
      paymentAmount: registration.paymentAmount,
      ticketNumber: registration.ticketNumber,
      validatedAt: registration.validatedAt,
      validatedBy: registration.validatedBy?.toString(),
      facePhotoPath: registration.facePhotoPath,
      receiptPath: registration.receiptPath,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt
    }));
  }

  /**
   * Generate registration card
   */
  static async generateRegistrationCard(registrationId: string) {
    const registration = await mongoStorage.getEventRegistration(registrationId);
    
    if (!registration) {
      throw new Error('Registration not found');
    }

    const event = await mongoStorage.getEvent(registration.eventId.toString());
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Generate QR code for the registration
    const qrCodeData = JSON.stringify({
      eventId: registration.eventId.toString(),
      registrationId: registration.uniqueId, // Keep for backward compatibility
      uniqueId: registration.uniqueId, // Add explicit uniqueId field
      timestamp: Date.now()
    });
    
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    return {
      registration: {
        id: registration._id?.toString(),
        ...registration
      },
      event: {
        id: event._id?.toString(),
        ...event
      },
      qrCodeImage
    };
  }

  /**
   * Check registration eligibility
   */
  static async checkRegistrationEligibility(eventId: string, userType: string, auxiliaryBody?: string) {
    const event = await mongoStorage.getEvent(eventId);
    
    if (!event) {
      return { eligible: false, reason: 'Event not found' };
    }

    // Check if registration is open
    const now = new Date();
    if (event.registrationStartDate && now < event.registrationStartDate) {
      return { eligible: false, reason: 'Registration has not started yet' };
    }

    if (event.registrationEndDate && now > event.registrationEndDate) {
      return { eligible: false, reason: 'Registration has ended' };
    }

    // Check user type eligibility
    if (userType === 'guest' && !event.allowGuests) {
      return { eligible: false, reason: 'Guests are not allowed for this event' };
    }

    if (userType === 'invitee' && !event.allowInvitees) {
      return { eligible: false, reason: 'Invitees are not allowed for this event' };
    }

    // Check auxiliary body eligibility
    if (auxiliaryBody && event.eligibleAuxiliaryBodies.length > 0) {
      if (!event.eligibleAuxiliaryBodies.includes(auxiliaryBody)) {
        return { 
          eligible: false, 
          reason: `Your auxiliary body (${auxiliaryBody}) is not eligible for this event` 
        };
      }
    }

    // Check capacity
    if (event.maxAttendees) {
      const registrations = await mongoStorage.getEventRegistrations(eventId);
      const activeRegistrations = registrations.filter(r => r.status !== 'cancelled');
      
      if (activeRegistrations.length >= event.maxAttendees) {
        return { eligible: false, reason: 'Event is full' };
      }
    }

    return { eligible: true, reason: 'Eligible for registration' };
  }
}