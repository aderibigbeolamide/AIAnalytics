import { 
  Organization, User, Member, Event, EventRegistration, Ticket, VerificationToken,
  type IOrganization, type IUser, type IMember, type IEvent, type IEventRegistration, type ITicket, type IVerificationToken,
  type InsertOrganization, type InsertUser, type InsertEvent
} from "@shared/mongoose-schema";
import mongoose from 'mongoose';

export interface IMongoStorage {
  // Organizations
  getOrganization(id: string): Promise<IOrganization | null>;
  getOrganizationByName(name: string): Promise<IOrganization | null>;
  getOrganizationByEmail(email: string): Promise<IOrganization | null>;
  getOrganizations(filters?: { status?: string }): Promise<IOrganization[]>;
  createOrganization(organization: InsertOrganization): Promise<IOrganization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<IOrganization | null>;
  updateOrganizationStatus(id: string, status: string): Promise<IOrganization | null>;
  
  // Users
  getUser(id: string): Promise<IUser | null>;
  getUserById(id: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  getAllUsers(): Promise<IUser[]>;
  getUsersByRole(role: string): Promise<IUser[]>;
  createUser(user: InsertUser): Promise<IUser>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<IUser | null>;

  // Notifications
  createNotification(notification: { recipientId: string; title: string; message: string; type?: string; priority?: string; metadata?: any }): Promise<any>;

  // Members
  getMember(id: string): Promise<IMember | null>;
  getMemberByUserId(userId: string): Promise<IMember | null>;
  getMemberByUsername(username: string): Promise<IMember | null>;
  getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<IMember[]>;
  createMember(member: Partial<IMember>): Promise<IMember>;
  updateMember(id: string, updates: Partial<IMember>): Promise<IMember | null>;
  deleteMember(id: string): Promise<boolean>;

  // Events
  getEvent(id: string): Promise<IEvent | null>;
  getEvents(filters?: { status?: string; createdBy?: string; organizationId?: string }): Promise<IEvent[]>;
  getEventsByOrganization(organizationId: string): Promise<IEvent[]>;
  createEvent(event: InsertEvent): Promise<IEvent>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<IEvent | null>;
  deleteEvent(id: string): Promise<boolean>; // Soft delete
  
  // Payment History
  getPaymentHistory(eventIds: string[]): Promise<any[]>;

  // Event Registrations
  getEventRegistration(id: string): Promise<IEventRegistration | null>;
  getEventRegistrationByQR(qrCode: string): Promise<IEventRegistration | null>;
  getEventRegistrationByUniqueId(uniqueId: string): Promise<IEventRegistration | null>;
  getEventRegistrations(eventId?: string, filters?: { 
    auxiliaryBody?: string; 
    uniqueId?: string; 
    startDate?: Date; 
    endDate?: Date;
    status?: string;
  }): Promise<IEventRegistration[]>;
  getMemberRegistrations(memberId: string): Promise<IEventRegistration[]>;
  createEventRegistration(registration: Partial<IEventRegistration>): Promise<IEventRegistration>;
  updateEventRegistration(id: string, updates: Partial<IEventRegistration>): Promise<IEventRegistration | null>;
  deleteEventRegistration(id: string): Promise<boolean>;

  // Tickets
  getTicket(id: string): Promise<ITicket | null>;
  getTicketById(id: string): Promise<ITicket | null>;
  getTicketByNumber(ticketNumber: string): Promise<ITicket | null>;
  getTickets(filters?: { eventId?: string; status?: string; paymentStatus?: string }): Promise<ITicket[]>;
  createTicket(ticket: Partial<ITicket>): Promise<ITicket>;
  updateTicket(id: string, updates: Partial<ITicket>): Promise<ITicket | null>;
  deleteTicket(id: string): Promise<boolean>;

  // Attendance
  createAttendance(attendance: any): Promise<any>;

  // Platform Settings
  getPlatformSettings(): Promise<any>;
  updatePlatformSettings(settings: any): Promise<any>;

  // Platform Settings
  getPlatformSettings(): Promise<any>;
  updatePlatformSettings(settings: any): Promise<any>;
  getAttendance(eventId: string): Promise<any[]>;
  
  // CSV Validation
  getMemberValidationCsv(eventId: string): Promise<any[]>;
  createMemberValidationCsv(csv: any): Promise<any>;

  // Verification Tokens
  createVerificationToken(token: Partial<IVerificationToken>): Promise<IVerificationToken>;
  getVerificationToken(email: string, token: string, type: 'email_verification' | 'password_reset'): Promise<IVerificationToken | null>;
  markVerificationTokenUsed(id: string): Promise<void>;
  deleteVerificationTokens(email: string, type: 'email_verification' | 'password_reset'): Promise<void>;
  deleteExpiredVerificationTokens(): Promise<void>;
}

export class MongoStorage implements IMongoStorage {
  // Organizations
  async getOrganization(id: string | mongoose.Types.ObjectId): Promise<IOrganization | null> {
    try {
      return await Organization.findById(id);
    } catch (error) {
      console.error('Error getting organization:', error);
      return null;
    }
  }

  async getOrganizationByName(name: string): Promise<IOrganization | null> {
    try {
      return await Organization.findOne({ name: name, deletedAt: { $exists: false } });
    } catch (error) {
      console.error('Error getting organization by name:', error);
      return null;
    }
  }

  async getOrganizationByEmail(email: string): Promise<IOrganization | null> {
    try {
      return await Organization.findOne({ contactEmail: email });
    } catch (error) {
      console.error('Error getting organization by email:', error);
      return null;
    }
  }

  async getOrganizations(filters?: { status?: string }): Promise<IOrganization[]> {
    try {
      const query: any = {};
      if (filters?.status) {
        query.status = filters.status;
      }
      return await Organization.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting organizations:', error);
      return [];
    }
  }

  async createOrganization(organization: InsertOrganization): Promise<IOrganization> {
    try {
      const newOrg = new Organization(organization);
      return await newOrg.save();
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<IOrganization | null> {
    try {
      return await Organization.findByIdAndUpdate(id, updates, { new: true });
    } catch (error) {
      console.error('Error updating organization:', error);
      return null;
    }
  }

  async updateOrganizationStatus(id: string, status: string): Promise<IOrganization | null> {
    try {
      const updates: any = { status, updatedAt: new Date() };
      
      // Set approvedAt when status is approved
      if (status === 'approved') {
        updates.approvedAt = new Date();
      }
      
      return await Organization.findByIdAndUpdate(id, updates, { new: true });
    } catch (error) {
      console.error('Error updating organization status:', error);
      return null;
    }
  }

  // Users
  async getUser(id: string): Promise<IUser | null> {
    try {
      return await User.findById(id).populate('organizationId');
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<IUser | null> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    try {
      return await User.findOne({ username }).populate('organizationId');
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email }).populate('organizationId');
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<IUser[]> {
    try {
      return await User.find().populate('organizationId').sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(user: InsertUser): Promise<IUser> {
    try {
      const newUser = new User(user);
      return await newUser.save();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(id, updates, { new: true }).populate('organizationId');
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  async getUsersByRole(role: string): Promise<IUser[]> {
    try {
      return await User.find({ role }).populate('organizationId').sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  }

  async createNotification(notification: { recipientId: string; title: string; message: string; type?: string; priority?: string; metadata?: any }): Promise<any> {
    try {
      const { Notification } = await import('@shared/mongoose-schema');
      const newNotification = new Notification({
        recipientId: notification.recipientId,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general',
        priority: notification.priority || 'medium',
        data: notification.metadata || {},
        isRead: false
      });
      return await newNotification.save();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Members
  async getMember(id: string): Promise<IMember | null> {
    try {
      return await Member.findById(id).populate('userId');
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  async getMemberByUserId(userId: string): Promise<IMember | null> {
    try {
      return await Member.findOne({ userId }).populate('userId');
    } catch (error) {
      console.error('Error getting member by user ID:', error);
      return null;
    }
  }

  async getMemberByUsername(username: string): Promise<IMember | null> {
    try {
      return await Member.findOne({ username }).populate('userId');
    } catch (error) {
      console.error('Error getting member by username:', error);
      return null;
    }
  }

  async getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<IMember[]> {
    try {
      const query: any = { deletedAt: { $exists: false } };
      
      if (filters?.auxiliaryBody) {
        query.auxiliaryBody = filters.auxiliaryBody;
      }
      
      if (filters?.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { username: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      return await Member.find(query).populate('userId').sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  async createMember(member: Partial<IMember>): Promise<IMember> {
    try {
      const newMember = new Member(member);
      return await newMember.save();
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  }

  async updateMember(id: string, updates: Partial<IMember>): Promise<IMember | null> {
    try {
      return await Member.findByIdAndUpdate(id, updates, { new: true }).populate('userId');
    } catch (error) {
      console.error('Error updating member:', error);
      return null;
    }
  }

  async deleteMember(id: string): Promise<boolean> {
    try {
      const result = await Member.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
      return !!result;
    } catch (error) {
      console.error('Error deleting member:', error);
      return false;
    }
  }

  // Events
  async getEvent(id: string | mongoose.Types.ObjectId): Promise<IEvent | null> {
    try {
      return await Event.findById(id);
    } catch (error) {
      console.error('Error getting event:', error);
      return null;
    }
  }

  async getEventById(id: string): Promise<IEvent | null> {
    try {
      return await Event.findById(id);
    } catch (error) {
      console.error('Error getting event by ID:', error);
      return null;
    }
  }

  async getEvents(filters?: { status?: string; createdBy?: string; organizationId?: string }): Promise<IEvent[]> {
    try {
      const query: any = { deletedAt: { $exists: false } };
      
      if (filters?.status) {
        query.status = filters.status;
      }
      
      if (filters?.createdBy) {
        query.createdBy = filters.createdBy;
      }
      
      if (filters?.organizationId) {
        // Handle both string IDs and ObjectId strings properly
        query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
      }
      
      return await Event.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  async createEvent(event: InsertEvent): Promise<IEvent> {
    try {
      const newEvent = new Event(event);
      return await newEvent.save();
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<IEvent | null> {
    try {
      return await Event.findByIdAndUpdate(id, updates, { new: true });
    } catch (error) {
      console.error('Error updating event:', error);
      return null;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    try {
      const result = await Event.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
      return !!result;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // Event Registrations
  async getEventRegistration(id: string): Promise<IEventRegistration | null> {
    try {
      return await EventRegistration.findById(id).populate('eventId memberId validatedBy');
    } catch (error) {
      console.error('Error getting event registration:', error);
      return null;
    }
  }

  async getEventRegistrationByQR(qrCode: string): Promise<IEventRegistration | null> {
    try {
      return await EventRegistration.findOne({ qrCode }).populate('eventId memberId validatedBy');
    } catch (error) {
      console.error('Error getting event registration by QR:', error);
      return null;
    }
  }

  async getEventRegistrationByUniqueId(uniqueId: string): Promise<IEventRegistration | null> {
    try {
      // Use the comprehensive search function
      return await this.getEventRegistrationByAnyCode(uniqueId);
    } catch (error) {
      console.error('Error getting event registration by unique ID:', error);
      return null;
    }
  }

  async getEventRegistrationByAnyCode(code: string): Promise<IEventRegistration | null> {
    try {
      // First try the comprehensive registration search
      const registration = await this.getRegistrationOrTicketByCode(code);
      return registration;
    } catch (error) {
      console.error('Error getting event registration by any code:', error);
      return null;
    }
  }

  async getRegistrationOrTicketByCode(code: string): Promise<IEventRegistration | null> {
    try {
      // Normalize input code (case-insensitive)
      const normalizedCode = String(code || '').trim().toUpperCase();
      
      if (!normalizedCode) {
        return null;
      }

      // First, search EventRegistration collection with case-insensitive regex
      const registrationQuery = {
        $or: [
          // Main fields - case insensitive
          { uniqueId: { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { manualVerificationCode: { $regex: `^${normalizedCode}$`, $options: 'i' } },
          
          // Nested in registrationData
          { 'registrationData.uniqueId': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { 'registrationData.manualVerificationCode': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          
          // Other potential nested locations
          { 'verificationCodes.manual': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { 'verification.manualVerificationCode': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { 'customData.uniqueId': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { 'customData.manualVerificationCode': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          
          // Legacy or variant field names
          { ticketNumber: { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { verificationCode: { $regex: `^${normalizedCode}$`, $options: 'i' } }
        ]
      };

      let result = await EventRegistration.findOne(registrationQuery).populate('eventId memberId validatedBy');
      
      if (result) {
        return result;
      }

      // If not found in EventRegistration, search Ticket collection  
      const { Ticket } = await import('../shared/mongoose-schema');
      const ticketQuery = {
        $or: [
          { ticketNumber: { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { manualVerificationCode: { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { 'verification.manualVerificationCode': { $regex: `^${normalizedCode}$`, $options: 'i' } },
          { uniqueId: { $regex: `^${normalizedCode}$`, $options: 'i' } }
        ]
      };

      const ticket = await Ticket.findOne(ticketQuery).populate('eventId userId');
      
      if (ticket) {
        // Convert ticket to registration-like format for consistent API response
        return {
          _id: ticket._id,
          eventId: ticket.eventId,
          registrationType: 'ticket',
          firstName: ticket.ownerName?.split(' ')[0] || ticket.firstName || '',
          lastName: ticket.ownerName?.split(' ').slice(1).join(' ') || ticket.lastName || '',
          email: ticket.ownerEmail || ticket.email || '',
          uniqueId: ticket.ticketNumber || ticket.uniqueId || ticket.manualVerificationCode,
          status: ticket.status || 'active',
          qrCode: ticket.qrCode || '',
          createdAt: ticket.createdAt,
          // Identify this as a ticket-based result
          isTicket: true
        } as any;
      }

      return null;
    } catch (error) {
      console.error('Error getting registration or ticket by code:', error);
      return null;
    }
  }

  async getEventRegistrations(eventId?: string, filters?: { 
    auxiliaryBody?: string; 
    uniqueId?: string; 
    startDate?: Date; 
    endDate?: Date;
    status?: string;
    eventIds?: string[];
    paymentStatus?: string;
  }): Promise<IEventRegistration[]> {
    try {
      const query: any = {};
      
      if (eventId) {
        query.eventId = eventId;
      }
      
      // Handle multiple event IDs for payment history queries
      if (filters?.eventIds && filters.eventIds.length > 0) {
        query.eventId = { $in: filters.eventIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
      
      if (filters?.auxiliaryBody) {
        query.auxiliaryBody = filters.auxiliaryBody;
      }
      
      if (filters?.uniqueId) {
        query.uniqueId = filters.uniqueId;
      }
      
      if (filters?.status) {
        query.status = filters.status;
      }
      
      if (filters?.paymentStatus) {
        query.paymentStatus = filters.paymentStatus;
      }
      
      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }
      
      return await EventRegistration.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting event registrations:', error);
      return [];
    }
  }

  async getMemberRegistrations(memberId: string): Promise<IEventRegistration[]> {
    try {
      return await EventRegistration.find({ memberId }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting member registrations:', error);
      return [];
    }
  }

  async createEventRegistration(registration: Partial<IEventRegistration>): Promise<IEventRegistration> {
    try {
      const newRegistration = new EventRegistration(registration);
      return await newRegistration.save();
    } catch (error) {
      console.error('Error creating event registration:', error);
      throw error;
    }
  }

  async updateEventRegistration(id: string, updates: Partial<IEventRegistration>): Promise<IEventRegistration | null> {
    try {
      return await EventRegistration.findByIdAndUpdate(id, updates, { new: true });
    } catch (error) {
      console.error('Error updating event registration:', error);
      return null;
    }
  }

  async deleteEventRegistration(id: string): Promise<boolean> {
    try {
      const result = await EventRegistration.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error deleting event registration:', error);
      return false;
    }
  }

  // Tickets
  async getTicket(id: string): Promise<ITicket | null> {
    try {
      return await Ticket.findById(id);
    } catch (error) {
      console.error('Error getting ticket:', error);
      return null;
    }
  }

  async getTicketById(id: string): Promise<ITicket | null> {
    return this.getTicket(id);
  }

  async getTicketByNumber(ticketNumber: string): Promise<ITicket | null> {
    try {
      // Search by ticketNumber field first
      let ticket = await Ticket.findOne({ ticketNumber });
      
      if (ticket) {
        return ticket;
      }
      
      // Search by other ID fields that might contain the manual verification code
      ticket = await Ticket.findOne({
        $or: [
          { uniqueId: ticketNumber },
          { manualVerificationCode: ticketNumber },
          { 'customData.uniqueId': ticketNumber },
          { 'customData.manualVerificationCode': ticketNumber }
        ]
      });
      
      return ticket;
    } catch (error) {
      console.error('Error getting ticket by number:', error);
      return null;
    }
  }

  async getTickets(filters?: { eventId?: string; status?: string; paymentStatus?: string; eventIds?: string[] }): Promise<ITicket[]> {
    try {
      const query: any = {};
      
      if (filters?.eventId) {
        query.eventId = new mongoose.Types.ObjectId(filters.eventId);
      }
      
      if (filters?.eventIds && filters.eventIds.length > 0) {
        query.eventId = { $in: filters.eventIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
      
      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.paymentStatus) {
        query.paymentStatus = filters.paymentStatus;
      }
      
      return await Ticket.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting tickets:', error);
      return [];
    }
  }

  async createTicket(ticket: Partial<ITicket>): Promise<ITicket> {
    try {
      const newTicket = new Ticket(ticket);
      return await newTicket.save();
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  async updateTicket(id: string, updates: Partial<ITicket>): Promise<ITicket | null> {
    try {
      return await Ticket.findByIdAndUpdate(id, updates, { new: true });
    } catch (error) {
      console.error('Error updating ticket:', error);
      return null;
    }
  }

  async deleteTicket(id: string): Promise<boolean> {
    try {
      const result = await Ticket.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return false;
    }
  }

  async getEventsByOrganization(organizationId: string): Promise<IEvent[]> {
    try {
      return await Event.find({ 
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: { $ne: 'deleted' }
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting events by organization:', error);
      return [];
    }
  }

  async getPaymentHistory(eventIds: string[]): Promise<any[]> {
    try {
      const objectIds = eventIds.map(id => new mongoose.Types.ObjectId(id));
      
      // Get all paid registrations for the events with event details
      const payments = await EventRegistration.aggregate([
        {
          $match: {
            eventId: { $in: objectIds },
            paymentStatus: 'paid'
          }
        },
        {
          $lookup: {
            from: 'events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'event'
          }
        },
        {
          $unwind: '$event'
        },
        {
          $project: {
            _id: 1,
            paymentReference: 1,
            paymentAmount: 1,
            paymentStatus: 1,
            paymentVerifiedAt: 1,
            firstName: 1,
            lastName: 1,
            createdAt: 1,
            eventName: '$event.name'
          }
        },
        {
          $sort: { paymentVerifiedAt: -1, createdAt: -1 }
        }
      ]);

      return payments;
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  // Attendance methods
  async createAttendance(attendance: any): Promise<any> {
    try {
      // Create a simple attendance record in MongoDB
      const attendanceData = {
        ...attendance,
        scannedAt: new Date(),
        id: new mongoose.Types.ObjectId().toString()
      };
      
      // Since we don't have a specific Attendance model, store in a collection
      const collection = mongoose.connection.db.collection('attendance');
      const result = await collection.insertOne(attendanceData);
      return { ...attendanceData, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating attendance:', error);
      throw error;
    }
  }

  async getAttendance(eventId: string): Promise<any[]> {
    try {
      const collection = mongoose.connection.db.collection('attendance');
      return await collection.find({ eventId }).toArray();
    } catch (error) {
      console.error('Error getting attendance:', error);
      return [];
    }
  }

  // CSV Validation methods
  async getMemberValidationCsv(eventId: string): Promise<any[]> {
    try {
      const collection = mongoose.connection.db.collection('member_validation_csv');
      return await collection.find({ eventId }).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error getting member validation CSV:', error);
      return [];
    }
  }

  async createMemberValidationCsv(csv: any): Promise<any> {
    try {
      const csvData = {
        ...csv,
        createdAt: new Date(),
        id: new mongoose.Types.ObjectId().toString()
      };
      
      const collection = mongoose.connection.db.collection('member_validation_csv');
      const result = await collection.insertOne(csvData);
      return { ...csvData, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating member validation CSV:', error);
      throw error;
    }
  }

  // Event Reports methods
  async createEventReport(report: any): Promise<any> {
    try {
      const reportData = {
        ...report,
        createdAt: new Date(),
        id: new mongoose.Types.ObjectId().toString()
      };
      
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collection = db.collection('event_reports');
      const result = await collection.insertOne(reportData);
      return { ...reportData, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating event report:', error);
      throw error;
    }
  }

  async getEventReports(eventId?: string): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collection = db.collection('event_reports');
      const query = eventId ? { eventId } : {};
      return await collection.find(query).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error getting event reports:', error);
      return [];
    }
  }

  async getAllEventReports(): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collection = db.collection('event_reports');
      return await collection.find({}).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error getting all event reports:', error);
      return [];
    }
  }

  async getReportsByOrganization(organizationId: string): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collection = db.collection('event_reports');
      const query = { organizationId: organizationId };
      return await collection.find(query).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error getting reports by organization:', error);
      return [];
    }
  }

  async getReportById(id: string): Promise<any | null> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collection = db.collection('event_reports');
      return await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    } catch (error) {
      console.error('Error getting report by id:', error);
      return null;
    }
  }

  async updateEventReport(id: string, updates: any): Promise<any | null> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collection = db.collection('event_reports');
      const result = await collection.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      console.log('MongoDB update result:', result);
      return result || null;
    } catch (error) {
      console.error('Error updating event report:', error);
      return null;
    }
  }

  // Attendance Stats method
  async getAttendanceStats(): Promise<{ totalScans: number; validationRate: number; scansToday: number }> {
    try {
      const collection = mongoose.connection.db.collection('attendance');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const totalScans = await collection.countDocuments({});
      const scansToday = await collection.countDocuments({
        scannedAt: { $gte: today }
      });
      
      // Calculate validation rate based on successful scans vs total registrations
      const totalRegistrations = await EventRegistration.countDocuments({});
      const validationRate = totalRegistrations > 0 ? Math.round((totalScans / totalRegistrations) * 100) : 0;
      
      return {
        totalScans,
        validationRate,
        scansToday
      };
    } catch (error) {
      console.error('Error getting attendance stats:', error);
      return {
        totalScans: 0,
        validationRate: 0,
        scansToday: 0
      };
    }
  }

  // Platform Settings methods
  async getPlatformSettings(): Promise<any> {
    try {
      const collection = mongoose.connection.db.collection('platform_settings');
      return await collection.findOne({}) || { platformFee: 2 };
    } catch (error) {
      console.error('Error getting platform settings:', error);
      return { platformFee: 2 };
    }
  }

  async updatePlatformSettings(settings: any): Promise<any> {
    try {
      const collection = mongoose.connection.db.collection('platform_settings');
      return await collection.updateOne(
        {},
        { $set: { ...settings, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating platform settings:', error);
      throw error;
    }
  }

  // Verification Token methods
  async createVerificationToken(token: Partial<IVerificationToken>): Promise<IVerificationToken> {
    try {
      const newToken = new VerificationToken(token);
      return await newToken.save();
    } catch (error) {
      console.error('Error creating verification token:', error);
      throw error;
    }
  }

  async getVerificationToken(email: string, token: string, type: 'email_verification' | 'password_reset'): Promise<IVerificationToken | null> {
    try {
      return await VerificationToken.findOne({ 
        email, 
        token, 
        type, 
        used: false,
        expiresAt: { $gt: new Date() }
      });
    } catch (error) {
      console.error('Error getting verification token:', error);
      return null;
    }
  }

  async markVerificationTokenUsed(id: string): Promise<void> {
    try {
      await VerificationToken.findByIdAndUpdate(id, { used: true });
    } catch (error) {
      console.error('Error marking verification token as used:', error);
      throw error;
    }
  }

  async deleteVerificationTokens(email: string, type: 'email_verification' | 'password_reset'): Promise<void> {
    try {
      await VerificationToken.deleteMany({ email, type });
    } catch (error) {
      console.error('Error deleting verification tokens:', error);
      throw error;
    }
  }

  async deleteExpiredVerificationTokens(): Promise<void> {
    try {
      await VerificationToken.deleteMany({ 
        expiresAt: { $lte: new Date() }
      });
    } catch (error) {
      console.error('Error deleting expired verification tokens:', error);
      throw error;
    }
  }
}

export const mongoStorage = new MongoStorage();