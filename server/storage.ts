import { 
  users, members, events, eventRegistrations, attendance, eventReports, invitations, 
  memberValidationCsv, faceRecognitionPhotos, tickets, ticketTransfers,
  eventCapacity, userPreferences, eventRecommendations,
  type User, type InsertUser, type Member, type InsertMember,
  type Event, type InsertEvent, type EventRegistration, type InsertEventRegistration,
  type Attendance, type InsertAttendance, type Invitation, type InsertInvitation,
  type EventReport, type InsertEventReport, type MemberValidationCsv, type InsertMemberValidationCsv,
  type FaceRecognitionPhoto, type InsertFaceRecognitionPhoto, type Ticket, type TicketTransfer,
  type EventCapacity, type InsertEventCapacity, type UserPreferences, type InsertUserPreferences,
  type EventRecommendation, type InsertEventRecommendation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, or, ilike, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Members
  getMember(id: number): Promise<Member | undefined>;
  getMemberByUserId(userId: number): Promise<Member | undefined>;
  getMemberByUsername(username: string): Promise<Member | undefined>;

  getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, updates: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;

  // Events
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(filters?: { status?: string; createdBy?: number }): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>; // Soft delete

  // Event Registrations
  getEventRegistration(id: number): Promise<EventRegistration | undefined>;
  getEventRegistrationByQR(qrCode: string): Promise<EventRegistration | undefined>;
  getEventRegistrationByUniqueId(uniqueId: string): Promise<EventRegistration | undefined>;
  getEventRegistrations(eventId?: number, filters?: { 
    auxiliaryBody?: string; 
    uniqueId?: string; 
    startDate?: Date; 
    endDate?: Date;
    status?: string;
  }): Promise<EventRegistration[]>;
  getMemberRegistrations(memberId: number): Promise<EventRegistration[]>;
  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration>;
  updateEventRegistration(id: number, updates: Partial<InsertEventRegistration>): Promise<EventRegistration | undefined>;

  // Attendance
  getAttendance(eventId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceStats(): Promise<{ totalScans: number; validationRate: number; scansToday: number }>;

  // Invitations
  getInvitation(id: number): Promise<Invitation | undefined>;
  getEventInvitations(eventId: number): Promise<Invitation[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: number, updates: Partial<InsertInvitation>): Promise<Invitation | undefined>;

  // Event Reports
  getEventReport(id: number): Promise<EventReport | undefined>;
  getEventReports(eventId: number): Promise<EventReport[]>;
  getAllEventReports(): Promise<EventReport[]>;
  createEventReport(report: InsertEventReport): Promise<EventReport>;
  updateEventReport(id: number, updates: Partial<InsertEventReport>): Promise<EventReport | undefined>;

  // Member Validation CSV
  getMemberValidationCsv(eventId: number): Promise<MemberValidationCsv[]>;
  createMemberValidationCsv(csv: InsertMemberValidationCsv): Promise<MemberValidationCsv>;
  deleteMemberValidationCsv(id: number): Promise<boolean>;

  // Face Recognition Photos
  getFaceRecognitionPhotos(eventId?: number): Promise<FaceRecognitionPhoto[]>;
  createFaceRecognitionPhoto(photo: InsertFaceRecognitionPhoto): Promise<FaceRecognitionPhoto>;
  deleteFaceRecognitionPhoto(id: number): Promise<boolean>;

  // Event Capacity (Seat Heatmap)
  getEventCapacity(eventId: number): Promise<EventCapacity | undefined>;
  createEventCapacity(capacity: InsertEventCapacity): Promise<EventCapacity>;
  updateEventCapacity(eventId: number, updates: Partial<InsertEventCapacity>): Promise<EventCapacity | undefined>;

  // User Preferences
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: number, preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Event Recommendations
  getEventRecommendations(userId: number, limit?: number): Promise<EventRecommendation[]>;
  createEventRecommendation(recommendation: InsertEventRecommendation): Promise<EventRecommendation>;
  updateEventRecommendation(id: number, updates: Partial<InsertEventRecommendation>): Promise<EventRecommendation | undefined>;
  generateRecommendations(userId: number): Promise<EventRecommendation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private members: Map<number, Member> = new Map();
  private events: Map<number, Event> = new Map();
  private eventRegistrations: Map<number, EventRegistration> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private invitations: Map<number, Invitation> = new Map();
  private eventReports: Map<number, EventReport> = new Map();
  private memberValidationCsv: Map<number, MemberValidationCsv> = new Map();
  private faceRecognitionPhotos: Map<number, FaceRecognitionPhoto> = new Map();
  
  private nextUserId = 1;
  private nextMemberId = 1;
  private nextEventId = 1;
  private nextEventRegistrationId = 1;
  private nextAttendanceId = 1;
  private nextInvitationId = 1;
  private nextEventReportId = 1;
  private nextMemberValidationCsvId = 1;
  private nextFaceRecognitionPhotoId = 1;

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      createdAt: new Date(),
      ...insertUser
    } as User;
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Members
  async getMember(id: number): Promise<Member | undefined> {
    const member = this.members.get(id);
    return member && !member.deletedAt ? member : undefined;
  }

  async getMemberByUserId(userId: number): Promise<Member | undefined> {
    for (const member of this.members.values()) {
      if (member.userId === userId && !member.deletedAt) {
        return member;
      }
    }
    return undefined;
  }

  async getMemberByUsername(username: string): Promise<Member | undefined> {
    for (const member of this.members.values()) {
      if (member.username === username && !member.deletedAt) {
        return member;
      }
    }
    return undefined;
  }

  async getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<Member[]> {
    const memberList = Array.from(this.members.values())
      .filter(member => !member.deletedAt);

    let filteredMembers = memberList;

    if (filters?.auxiliaryBody) {
      filteredMembers = filteredMembers.filter(member => 
        member.auxiliaryBody === filters.auxiliaryBody
      );
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredMembers = filteredMembers.filter(member =>
        member.firstName?.toLowerCase().includes(searchTerm) ||
        member.lastName?.toLowerCase().includes(searchTerm) ||
        member.email?.toLowerCase().includes(searchTerm) ||
        member.username?.toLowerCase().includes(searchTerm)
      );
    }

    return filteredMembers.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const member: Member = {
      id: this.nextMemberId++,
      createdAt: new Date(),
      ...insertMember
    } as Member;
    this.members.set(member.id, member);
    return member;
  }

  async updateMember(id: number, updates: Partial<InsertMember>): Promise<Member | undefined> {
    const member = this.members.get(id);
    if (!member || member.deletedAt) return undefined;
    
    const updatedMember = { ...member, ...updates };
    this.members.set(id, updatedMember);
    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    const member = this.members.get(id);
    if (!member || member.deletedAt) return false;
    
    const updatedMember = { ...member, deletedAt: new Date() };
    this.members.set(id, updatedMember);
    return true;
  }

  private determineEventStatus(event: Event): string {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (event.status === 'cancelled') return 'cancelled';
    
    if (now >= startDate && now <= endDate) {
      return 'ongoing';
    } else if (now < startDate) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event || event.deletedAt) return undefined;
    
    const dynamicStatus = this.determineEventStatus(event);
    if (dynamicStatus !== event.status) {
      event.status = dynamicStatus;
      this.events.set(id, event);
    }
    
    return event;
  }

  async getEvents(filters?: { status?: string; createdBy?: number }): Promise<Event[]> {
    let eventList = Array.from(this.events.values())
      .filter(event => !event.deletedAt);
    
    if (filters?.createdBy) {
      eventList = eventList.filter(event => event.createdBy === filters.createdBy);
    }
    
    // Update event statuses dynamically
    const updatedEvents = eventList.map(event => {
      const dynamicStatus = this.determineEventStatus(event);
      if (dynamicStatus !== event.status) {
        event.status = dynamicStatus;
        this.events.set(event.id, event);
      }
      return event;
    });
    
    // Apply status filter after dynamic update
    if (filters?.status) {
      return updatedEvents.filter(event => event.status === filters.status);
    }
    
    return updatedEvents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const event: Event = {
      id: this.nextEventId++,
      createdAt: new Date(),
      deletedAt: null,
      endDate: null,
      registrationStartDate: null,
      registrationEndDate: null,
      allowGuests: false,
      requiresPayment: false,
      paymentAmount: null,
      eventType: 'registration',
      ticketCategories: [],
      paymentSettings: {
        requiresPayment: false,
        paymentMethods: [],
        paymentRules: { member: false, guest: false, invitee: false },
        allowManualReceipt: true,
        useOrganizerAccount: false,
        platformFeePercentage: 0,
        splitPayment: false
      },
      customRegistrationFields: [],
      status: 'upcoming',
      qrCode: null,
      reportLink: null,
      description: null,
      ...insertEvent
    };
    this.events.set(event.id, event);
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event || event.deletedAt) return undefined;
    
    const updatedEvent = { ...event, ...updates } as Event;
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      const event = this.events.get(id);
      if (!event) return false;
      
      const deletedAt = new Date();
      
      // Soft delete the event
      const updatedEvent = { ...event, deletedAt };
      this.events.set(id, updatedEvent);
      
      // Also cancel all registrations for this event
      for (const registration of this.eventRegistrations.values()) {
        if (registration.eventId === id) {
          const updatedRegistration = { ...registration, status: 'cancelled' };
          this.eventRegistrations.set(registration.id, updatedRegistration);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // Event Registrations
  async getEventRegistration(id: number): Promise<EventRegistration | undefined> {
    const registration = this.eventRegistrations.get(id);
    if (!registration) return undefined;
    
    // Get associated member if exists
    if (registration.memberId) {
      const member = this.members.get(registration.memberId);
      return { ...registration, member } as any;
    }
    
    return registration;
  }

  async getEventRegistrationByQR(qrCode: string): Promise<EventRegistration | undefined> {
    for (const registration of this.eventRegistrations.values()) {
      if (registration.qrCode === qrCode) {
        return registration;
      }
    }
    return undefined;
  }

  async getEventRegistrationByUniqueId(uniqueId: string): Promise<EventRegistration | undefined> {
    for (const registration of this.eventRegistrations.values()) {
      if (registration.uniqueId === uniqueId) {
        return registration;
      }
    }
    return undefined;
  }

  async getEventRegistrations(eventId?: number, filters?: { 
    auxiliaryBody?: string; 
    uniqueId?: string; 
    startDate?: Date; 
    endDate?: Date;
    status?: string;
  }): Promise<EventRegistration[]> {
    let registrationList = Array.from(this.eventRegistrations.values());
    
    if (eventId) {
      registrationList = registrationList.filter(reg => reg.eventId === eventId);
    }
    
    if (filters?.auxiliaryBody) {
      registrationList = registrationList.filter(reg => 
        reg.guestAuxiliaryBody === filters.auxiliaryBody
      );
    }
    
    if (filters?.uniqueId) {
      registrationList = registrationList.filter(reg => 
        reg.uniqueId === filters.uniqueId
      );
    }
    

    
    if (filters?.status) {
      registrationList = registrationList.filter(reg => 
        reg.status === filters.status
      );
    }
    
    if (filters?.startDate || filters?.endDate) {
      registrationList = registrationList.filter(reg => {
        const createdAt = new Date(reg.createdAt);
        if (filters.startDate && createdAt < filters.startDate) return false;
        if (filters.endDate && createdAt > filters.endDate) return false;
        return true;
      });
    }
    
    return registrationList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getMemberRegistrations(memberId: number): Promise<EventRegistration[]> {
    return Array.from(this.eventRegistrations.values())
      .filter(reg => reg.memberId === memberId);
  }

  async createEventRegistration(insertRegistration: InsertEventRegistration): Promise<EventRegistration> {
    const registration: EventRegistration = {
      id: this.nextEventRegistrationId++,
      createdAt: new Date(),
      ...insertRegistration
    } as EventRegistration;
    this.eventRegistrations.set(registration.id, registration);
    return registration;
  }

  async updateEventRegistration(id: number, updates: Partial<InsertEventRegistration>): Promise<EventRegistration | undefined> {
    const registration = this.eventRegistrations.get(id);
    if (!registration) return undefined;
    
    const updatedRegistration = { ...registration, ...updates };
    this.eventRegistrations.set(id, updatedRegistration);
    return updatedRegistration;
  }

  // Attendance
  async getAttendance(eventId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values())
      .filter(att => att.eventId === eventId);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const attendanceRecord: Attendance = {
      id: this.nextAttendanceId++,
      scannedAt: new Date(),
      ...insertAttendance
    } as Attendance;
    this.attendance.set(attendanceRecord.id, attendanceRecord);
    return attendanceRecord;
  }

  async getAttendanceStats(): Promise<{ totalScans: number; validationRate: number; scansToday: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allAttendance = Array.from(this.attendance.values());
    const totalScans = allAttendance.length;
    const validScans = allAttendance.filter(att => att.validationStatus === 'valid').length;
    const scansToday = allAttendance.filter(att => 
      new Date(att.scannedAt).getTime() >= today.getTime()
    ).length;
    
    return {
      totalScans,
      validationRate: totalScans > 0 ? (validScans / totalScans) * 100 : 0,
      scansToday
    };
  }

  // Invitations
  async getInvitation(id: number): Promise<Invitation | undefined> {
    return this.invitations.get(id);
  }

  async getEventInvitations(eventId: number): Promise<Invitation[]> {
    return Array.from(this.invitations.values())
      .filter(inv => inv.eventId === eventId);
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const invitation: Invitation = {
      id: this.nextInvitationId++,
      createdAt: new Date(),
      ...insertInvitation
    } as Invitation;
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async updateInvitation(id: number, updates: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const invitation = this.invitations.get(id);
    if (!invitation) return undefined;
    
    const updatedInvitation = { ...invitation, ...updates };
    this.invitations.set(id, updatedInvitation);
    return updatedInvitation;
  }

  // Event Reports
  async getEventReport(id: number): Promise<EventReport | undefined> {
    return this.eventReports.get(id);
  }

  async getEventReports(eventId: number): Promise<EventReport[]> {
    return Array.from(this.eventReports.values())
      .filter(report => report.eventId === eventId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllEventReports(): Promise<EventReport[]> {
    const reports = Array.from(this.eventReports.values());
    // Add event name to each report
    return reports.map(report => {
      const event = this.events.get(report.eventId);
      return {
        ...report,
        event: event ? { id: event.id, name: event.name } : null
      } as any;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createEventReport(insertReport: InsertEventReport): Promise<EventReport> {
    const report: EventReport = {
      id: this.nextEventReportId++,
      createdAt: new Date(),
      ...insertReport
    } as EventReport;
    this.eventReports.set(report.id, report);
    return report;
  }

  async updateEventReport(id: number, updates: Partial<InsertEventReport>): Promise<EventReport | undefined> {
    const report = this.eventReports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...updates };
    this.eventReports.set(id, updatedReport);
    return updatedReport;
  }

  // Member Validation CSV
  async getMemberValidationCsv(eventId: number): Promise<MemberValidationCsv[]> {
    return Array.from(this.memberValidationCsv.values())
      .filter(csv => csv.eventId === eventId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createMemberValidationCsv(insertCsv: InsertMemberValidationCsv): Promise<MemberValidationCsv> {
    const csv: MemberValidationCsv = {
      id: this.nextMemberValidationCsvId++,
      createdAt: new Date(),
      ...insertCsv
    } as MemberValidationCsv;
    this.memberValidationCsv.set(csv.id, csv);
    return csv;
  }

  async deleteMemberValidationCsv(id: number): Promise<boolean> {
    return this.memberValidationCsv.delete(id);
  }

  // Face Recognition Photos
  async getFaceRecognitionPhotos(eventId?: number): Promise<FaceRecognitionPhoto[]> {
    let photos = Array.from(this.faceRecognitionPhotos.values())
      .filter(photo => photo.isActive);
    
    if (eventId) {
      photos = photos.filter(photo => photo.eventId === eventId);
    }
    
    return photos.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createFaceRecognitionPhoto(insertPhoto: InsertFaceRecognitionPhoto): Promise<FaceRecognitionPhoto> {
    const photo: FaceRecognitionPhoto = {
      id: this.nextFaceRecognitionPhotoId++,
      createdAt: new Date(),
      ...insertPhoto
    } as FaceRecognitionPhoto;
    this.faceRecognitionPhotos.set(photo.id, photo);
    return photo;
  }

  async deleteFaceRecognitionPhoto(id: number): Promise<boolean> {
    const photo = this.faceRecognitionPhotos.get(id);
    if (!photo) return false;
    
    const updatedPhoto = { ...photo, isActive: false };
    this.faceRecognitionPhotos.set(id, updatedPhoto);
    return true;
  }

  // Event Capacity (Seat Heatmap) - Mock implementation for MemStorage
  async getEventCapacity(eventId: number): Promise<EventCapacity | undefined> {
    return undefined; // Not implemented in MemStorage
  }

  async createEventCapacity(capacity: InsertEventCapacity): Promise<EventCapacity> {
    const eventCapacity: EventCapacity = {
      id: 1,
      eventId: capacity.eventId,
      totalSeats: capacity.totalSeats,
      availableSeats: capacity.availableSeats,
      seatMap: capacity.seatMap,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return eventCapacity;
  }

  async updateEventCapacity(eventId: number, updates: Partial<InsertEventCapacity>): Promise<EventCapacity | undefined> {
    return undefined; // Not implemented in MemStorage
  }

  // User Preferences - Mock implementation for MemStorage
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return undefined; // Not implemented in MemStorage
  }

  async updateUserPreferences(userId: number, preferences: InsertUserPreferences): Promise<UserPreferences> {
    const userPrefs: UserPreferences = {
      id: 1,
      userId,
      preferences: preferences.preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return userPrefs;
  }

  // Event Recommendations - Mock implementation for MemStorage
  async getEventRecommendations(userId: number, limit = 10): Promise<EventRecommendation[]> {
    return []; // Not implemented in MemStorage
  }

  async createEventRecommendation(recommendation: InsertEventRecommendation): Promise<EventRecommendation> {
    const eventRec: EventRecommendation = {
      id: 1,
      userId: recommendation.userId,
      eventId: recommendation.eventId,
      score: recommendation.score,
      reasons: recommendation.reasons,
      status: recommendation.status,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return eventRec;
  }

  async updateEventRecommendation(id: number, updates: Partial<InsertEventRecommendation>): Promise<EventRecommendation | undefined> {
    return undefined; // Not implemented in MemStorage
  }

  async generateRecommendations(userId: number): Promise<EventRecommendation[]> {
    return []; // Not implemented in MemStorage
  }
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Members
  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(and(eq(members.id, id), isNull(members.deletedAt)));
    return member || undefined;
  }

  async getMemberByUserId(userId: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(and(eq(members.userId, userId), isNull(members.deletedAt)));
    return member || undefined;
  }

  async getMemberByUsername(username: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(and(eq(members.username, username), isNull(members.deletedAt)));
    return member || undefined;
  }

  async getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<Member[]> {
    let query = db.select().from(members).where(isNull(members.deletedAt));

    if (filters?.auxiliaryBody) {
      query = query.where(eq(members.auxiliaryBody, filters.auxiliaryBody));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.where(
        or(
          ilike(members.firstName, searchTerm),
          ilike(members.lastName, searchTerm),
          ilike(members.email, searchTerm),
          ilike(members.username, searchTerm)
        )
      );
    }

    const memberList = await query.orderBy(desc(members.createdAt));
    return memberList;
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db
      .insert(members)
      .values(insertMember)
      .returning();
    return member;
  }

  async updateMember(id: number, updates: Partial<InsertMember>): Promise<Member | undefined> {
    const [member] = await db
      .update(members)
      .set(updates)
      .where(and(eq(members.id, id), isNull(members.deletedAt)))
      .returning();
    return member || undefined;
  }

  async deleteMember(id: number): Promise<boolean> {
    const result = await db
      .update(members)
      .set({ deletedAt: new Date() })
      .where(and(eq(members.id, id), isNull(members.deletedAt)))
      .returning();
    return result.length > 0;
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(and(eq(events.id, id), isNull(events.deletedAt)));
    return event || undefined;
  }

  async getEvents(filters?: { status?: string; createdBy?: number }): Promise<Event[]> {
    let query = db.select().from(events).where(isNull(events.deletedAt));

    if (filters?.createdBy) {
      query = query.where(eq(events.createdBy, filters.createdBy));
    }

    if (filters?.status) {
      query = query.where(eq(events.status, filters.status));
    }

    const eventList = await query.orderBy(desc(events.createdAt));
    return eventList;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(updates)
      .where(and(eq(events.id, id), isNull(events.deletedAt)))
      .returning();
    return event || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(and(eq(events.id, id), isNull(events.deletedAt)))
      .returning();
    return result.length > 0;
  }

  // Event Registrations
  async getEventRegistration(id: number): Promise<EventRegistration | undefined> {
    const [registration] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.id, id));
    return registration || undefined;
  }

  async getEventRegistrationByQR(qrCode: string): Promise<EventRegistration | undefined> {
    const [registration] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.qrCode, qrCode));
    return registration || undefined;
  }

  async getEventRegistrationByUniqueId(uniqueId: string): Promise<EventRegistration | undefined> {
    const [registration] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.uniqueId, uniqueId));
    return registration || undefined;
  }

  async getEventRegistrations(eventId?: number, filters?: any): Promise<EventRegistration[]> {
    let query = db.select().from(eventRegistrations);

    if (eventId) {
      query = query.where(eq(eventRegistrations.eventId, eventId));
    }

    if (filters?.auxiliaryBody) {
      query = query.where(eq(eventRegistrations.auxiliaryBody, filters.auxiliaryBody));
    }

    if (filters?.status) {
      query = query.where(eq(eventRegistrations.status, filters.status));
    }

    const registrations = await query.orderBy(desc(eventRegistrations.createdAt));
    return registrations;
  }

  async getMemberRegistrations(memberId: number): Promise<EventRegistration[]> {
    const registrations = await db.select().from(eventRegistrations).where(eq(eventRegistrations.memberId, memberId));
    return registrations;
  }

  async createEventRegistration(insertRegistration: InsertEventRegistration): Promise<EventRegistration> {
    const [registration] = await db
      .insert(eventRegistrations)
      .values(insertRegistration)
      .returning();
    return registration;
  }

  async updateEventRegistration(id: number, updates: Partial<InsertEventRegistration>): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return registration || undefined;
  }

  // Attendance
  async getAttendance(eventId: number): Promise<Attendance[]> {
    const attendanceList = await db.select().from(attendance).where(eq(attendance.eventId, eventId));
    return attendanceList;
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [attendanceRecord] = await db
      .insert(attendance)
      .values(insertAttendance)
      .returning();
    return attendanceRecord;
  }

  async getAttendanceStats(): Promise<{ totalScans: number; validationRate: number; scansToday: number }> {
    const totalScans = await db.select({ count: sql<number>`count(*)` }).from(attendance);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scansToday = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(gte(attendance.scannedAt, today));
    
    return {
      totalScans: totalScans[0]?.count || 0,
      validationRate: 100, // Placeholder calculation
      scansToday: scansToday[0]?.count || 0
    };
  }

  // Invitations
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id));
    return invitation || undefined;
  }

  async getEventInvitations(eventId: number): Promise<Invitation[]> {
    const invitationList = await db.select().from(invitations).where(eq(invitations.eventId, eventId));
    return invitationList;
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db
      .insert(invitations)
      .values(insertInvitation)
      .returning();
    return invitation;
  }

  async updateInvitation(id: number, updates: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const [invitation] = await db
      .update(invitations)
      .set(updates)
      .where(eq(invitations.id, id))
      .returning();
    return invitation || undefined;
  }

  // Event Reports
  async getEventReport(id: number): Promise<EventReport | undefined> {
    const [report] = await db.select().from(eventReports).where(eq(eventReports.id, id));
    return report || undefined;
  }

  async getEventReports(eventId: number): Promise<EventReport[]> {
    const reports = await db.select().from(eventReports).where(eq(eventReports.eventId, eventId));
    return reports;
  }

  async getAllEventReports(): Promise<EventReport[]> {
    const reports = await db.select().from(eventReports).orderBy(desc(eventReports.createdAt));
    return reports;
  }

  async createEventReport(insertReport: InsertEventReport): Promise<EventReport> {
    const [report] = await db
      .insert(eventReports)
      .values(insertReport)
      .returning();
    return report;
  }

  async updateEventReport(id: number, updates: Partial<InsertEventReport>): Promise<EventReport | undefined> {
    const [report] = await db
      .update(eventReports)
      .set(updates)
      .where(eq(eventReports.id, id))
      .returning();
    return report || undefined;
  }

  // Member Validation CSV
  async getMemberValidationCsv(eventId: number): Promise<MemberValidationCsv[]> {
    const csvRecords = await db.select().from(memberValidationCsv).where(eq(memberValidationCsv.eventId, eventId));
    return csvRecords;
  }

  async createMemberValidationCsv(insertCsv: InsertMemberValidationCsv): Promise<MemberValidationCsv> {
    const [csv] = await db
      .insert(memberValidationCsv)
      .values(insertCsv)
      .returning();
    return csv;
  }

  async deleteMemberValidationCsv(id: number): Promise<boolean> {
    const result = await db.delete(memberValidationCsv).where(eq(memberValidationCsv.id, id)).returning();
    return result.length > 0;
  }

  // Face Recognition Photos
  async getFaceRecognitionPhotos(eventId?: number): Promise<FaceRecognitionPhoto[]> {
    let query = db.select().from(faceRecognitionPhotos).where(eq(faceRecognitionPhotos.isActive, true));

    if (eventId) {
      query = query.where(eq(faceRecognitionPhotos.eventId, eventId));
    }

    const photos = await query.orderBy(desc(faceRecognitionPhotos.createdAt));
    return photos;
  }

  async createFaceRecognitionPhoto(insertPhoto: InsertFaceRecognitionPhoto): Promise<FaceRecognitionPhoto> {
    const [photo] = await db
      .insert(faceRecognitionPhotos)
      .values(insertPhoto)
      .returning();
    return photo;
  }

  async deleteFaceRecognitionPhoto(id: number): Promise<boolean> {
    const result = await db
      .update(faceRecognitionPhotos)
      .set({ isActive: false })
      .where(eq(faceRecognitionPhotos.id, id))
      .returning();
    return result.length > 0;
  }

  // Event Capacity (Seat Heatmap)
  async getEventCapacity(eventId: number): Promise<EventCapacity | undefined> {
    const [capacity] = await db.select().from(eventCapacity).where(eq(eventCapacity.eventId, eventId));
    return capacity || undefined;
  }

  async createEventCapacity(insertCapacity: InsertEventCapacity): Promise<EventCapacity> {
    const [capacity] = await db
      .insert(eventCapacity)
      .values(insertCapacity)
      .returning();
    return capacity;
  }

  async updateEventCapacity(eventId: number, updates: Partial<InsertEventCapacity>): Promise<EventCapacity | undefined> {
    const [capacity] = await db
      .update(eventCapacity)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(eventCapacity.eventId, eventId))
      .returning();
    return capacity || undefined;
  }

  // User Preferences
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences || undefined;
  }

  async updateUserPreferences(userId: number, insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    // First try to update existing preferences
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({ ...insertPreferences, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new preferences
      const [created] = await db
        .insert(userPreferences)
        .values({ ...insertPreferences, userId })
        .returning();
      return created;
    }
  }

  // Event Recommendations
  async getEventRecommendations(userId: number, limit = 10): Promise<EventRecommendation[]> {
    const recommendations = await db
      .select()
      .from(eventRecommendations)
      .where(and(
        eq(eventRecommendations.userId, userId),
        or(
          eq(eventRecommendations.status, 'pending'),
          eq(eventRecommendations.status, 'viewed')
        )
      ))
      .orderBy(desc(eventRecommendations.score), desc(eventRecommendations.createdAt))
      .limit(limit);
    
    // Join with events to get event details
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const [event] = await db.select().from(events).where(eq(events.id, rec.eventId));
        return {
          ...rec,
          event
        };
      })
    );
    
    return enrichedRecommendations.filter(rec => rec.event);
  }

  async createEventRecommendation(insertRecommendation: InsertEventRecommendation): Promise<EventRecommendation> {
    const [recommendation] = await db
      .insert(eventRecommendations)
      .values(insertRecommendation)
      .returning();
    return recommendation;
  }

  async updateEventRecommendation(id: number, updates: Partial<InsertEventRecommendation>): Promise<EventRecommendation | undefined> {
    const [recommendation] = await db
      .update(eventRecommendations)
      .set(updates)
      .where(eq(eventRecommendations.id, id))
      .returning();
    return recommendation || undefined;
  }

  async generateRecommendations(userId: number): Promise<EventRecommendation[]> {
    // Get user preferences
    const userPref = await this.getUserPreferences(userId);
    
    // Get user's past registrations to understand behavior
    const userRegistrations = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .limit(10);

    // Get upcoming events
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(
        gte(events.startDate, new Date()),
        eq(events.status, 'upcoming')
      ))
      .orderBy(events.startDate)
      .limit(20);

    const recommendations: InsertEventRecommendation[] = [];

    for (const event of upcomingEvents) {
      let score = 0;
      const reasons: string[] = [];

      // Score based on user preferences
      if (userPref?.preferences) {
        const prefs = userPref.preferences;
        
        // Auxiliary body match
        if (prefs.auxiliaryBodies.some(ab => event.eligibleAuxiliaryBodies.includes(ab))) {
          score += 30;
          reasons.push('Matches your auxiliary body preference');
        }

        // Location preference
        if (prefs.locations.some(loc => event.location.toLowerCase().includes(loc.toLowerCase()))) {
          score += 20;
          reasons.push('In your preferred location');
        }

        // Price range preference
        if (event.paymentSettings?.requiresPayment && event.paymentSettings.amount) {
          const eventPrice = parseFloat(event.paymentSettings.amount);
          if (eventPrice >= prefs.priceRange.min && eventPrice <= prefs.priceRange.max) {
            score += 15;
            reasons.push('Within your price range');
          }
        } else if (!event.paymentSettings?.requiresPayment) {
          score += 10;
          reasons.push('Free event');
        }

        // Interest match (simple keyword matching)
        if (prefs.interests.some(interest => 
          event.name.toLowerCase().includes(interest.toLowerCase()) ||
          event.description?.toLowerCase().includes(interest.toLowerCase())
        )) {
          score += 25;
          reasons.push('Matches your interests');
        }
      }

      // Score based on past behavior
      const similarEvents = userRegistrations.filter(reg => {
        // Simple similarity check - same auxiliary body or location keywords
        return event.eligibleAuxiliaryBodies.some(ab => 
          reg.customFieldData && 
          Object.values(reg.customFieldData).some(val => 
            typeof val === 'string' && val.includes(ab)
          )
        );
      });

      if (similarEvents.length > 0) {
        score += 10 * Math.min(similarEvents.length, 3);
        reasons.push('Similar to events you\'ve attended');
      }

      // Recency bonus - events happening soon get slight boost
      const daysUntilEvent = Math.ceil(
        (new Date(event.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilEvent <= 7) {
        score += 5;
        reasons.push('Happening soon');
      }

      // Only recommend events with a decent score
      if (score >= 20) {
        recommendations.push({
          userId,
          eventId: event.id,
          score: Math.min(score, 100), // Cap at 100
          reasons,
          status: 'pending'
        });
      }
    }

    // Create recommendations in database
    const createdRecommendations = await Promise.all(
      recommendations.map(rec => this.createEventRecommendation(rec))
    );

    return createdRecommendations;
  }
}

// Switch to DatabaseStorage for PostgreSQL or MemStorage for in-memory fallback
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
