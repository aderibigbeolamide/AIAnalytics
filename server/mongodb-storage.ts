import { 
  Organization, User, Member, Event, EventRegistration, Ticket,
  type IOrganization, type IUser, type IMember, type IEvent, type IEventRegistration, type ITicket,
  type InsertOrganization, type InsertUser, type InsertEvent
} from "@shared/mongoose-schema";
import mongoose from 'mongoose';

export interface IMongoStorage {
  // Organizations
  getOrganization(id: string): Promise<IOrganization | null>;
  getOrganizationByEmail(email: string): Promise<IOrganization | null>;
  getOrganizations(filters?: { status?: string }): Promise<IOrganization[]>;
  createOrganization(organization: InsertOrganization): Promise<IOrganization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<IOrganization | null>;
  
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
  createEvent(event: InsertEvent): Promise<IEvent>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<IEvent | null>;
  deleteEvent(id: string): Promise<boolean>; // Soft delete

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

  // Tickets
  getTicket(id: string): Promise<ITicket | null>;
  getTicketById(id: string): Promise<ITicket | null>;
  getTicketByNumber(ticketNumber: string): Promise<ITicket | null>;
  getTickets(filters?: { eventId?: string; status?: string; paymentStatus?: string }): Promise<ITicket[]>;
  createTicket(ticket: Partial<ITicket>): Promise<ITicket>;
  updateTicket(id: string, updates: Partial<ITicket>): Promise<ITicket | null>;
}

export class MongoStorage implements IMongoStorage {
  // Organizations
  async getOrganization(id: string): Promise<IOrganization | null> {
    try {
      return await Organization.findById(id);
    } catch (error) {
      console.error('Error getting organization:', error);
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
      return await User.findOne({ username });
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
  async getEvent(id: string): Promise<IEvent | null> {
    try {
      return await Event.findById(id);
    } catch (error) {
      console.error('Error getting event:', error);
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
        query.organizationId = filters.organizationId;
      }
      
      return await Event.find(query).populate('organizationId createdBy').sort({ createdAt: -1 });
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
      return await Event.findByIdAndUpdate(id, updates, { new: true }).populate('organizationId createdBy');
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
      return await EventRegistration.findOne({ uniqueId }).populate('eventId memberId validatedBy');
    } catch (error) {
      console.error('Error getting event registration by unique ID:', error);
      return null;
    }
  }

  async getEventRegistrations(eventId?: string, filters?: { 
    auxiliaryBody?: string; 
    uniqueId?: string; 
    startDate?: Date; 
    endDate?: Date;
    status?: string;
  }): Promise<IEventRegistration[]> {
    try {
      const query: any = {};
      
      if (eventId) {
        query.eventId = eventId;
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
      
      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }
      
      return await EventRegistration.find(query).populate('eventId memberId validatedBy').sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting event registrations:', error);
      return [];
    }
  }

  async getMemberRegistrations(memberId: string): Promise<IEventRegistration[]> {
    try {
      return await EventRegistration.find({ memberId }).populate('eventId memberId validatedBy').sort({ createdAt: -1 });
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
      return await EventRegistration.findByIdAndUpdate(id, updates, { new: true }).populate('eventId memberId validatedBy');
    } catch (error) {
      console.error('Error updating event registration:', error);
      return null;
    }
  }

  // Tickets
  async getTicket(id: string): Promise<ITicket | null> {
    try {
      return await Ticket.findById(id).populate('eventId organizationId validatedBy');
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
      return await Ticket.findOne({ ticketNumber }).populate('eventId organizationId validatedBy');
    } catch (error) {
      console.error('Error getting ticket by number:', error);
      return null;
    }
  }

  async getTickets(filters?: { eventId?: string; status?: string; paymentStatus?: string }): Promise<ITicket[]> {
    try {
      const query: any = {};
      
      if (filters?.eventId) {
        query.eventId = new mongoose.Types.ObjectId(filters.eventId);
      }
      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.paymentStatus) {
        query.paymentStatus = filters.paymentStatus;
      }
      
      return await Ticket.find(query).populate('eventId organizationId validatedBy').sort({ createdAt: -1 });
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
      return await Ticket.findByIdAndUpdate(id, updates, { new: true }).populate('eventId organizationId validatedBy');
    } catch (error) {
      console.error('Error updating ticket:', error);
      return null;
    }
  }
}

export const mongoStorage = new MongoStorage();