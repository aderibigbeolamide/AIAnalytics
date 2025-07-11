import { 
  users, members, events, eventRegistrations, attendance, invitations, eventReports,
  memberValidationCsv, faceRecognitionPhotos,
  type User, type InsertUser, type Member, type InsertMember,
  type Event, type InsertEvent, type EventRegistration, type InsertEventRegistration,
  type Attendance, type InsertAttendance, type Invitation, type InsertInvitation,
  type EventReport, type InsertEventReport, type MemberValidationCsv, type InsertMemberValidationCsv,
  type FaceRecognitionPhoto, type InsertFaceRecognitionPhoto
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, like, ilike, isNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Members
  getMember(id: number): Promise<Member | undefined>;
  getMemberByUserId(userId: number): Promise<Member | undefined>;
  getMemberByUsername(username: string): Promise<Member | undefined>;
  getMemberByChandaNumber(chandaNumber: string): Promise<Member | undefined>;
  getMembers(filters?: { auxiliaryBody?: string; search?: string; chandaNumber?: string }): Promise<Member[]>;
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
    chandaNumber?: string; 
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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Members
  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async getMemberByUserId(userId: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.userId, userId));
    return member || undefined;
  }

  async getMemberByUsername(username: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.username, username));
    return member || undefined;
  }

  async getMemberByChandaNumber(chandaNumber: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.chandaNumber, chandaNumber));
    return member || undefined;
  }

  async getMembers(filters?: { auxiliaryBody?: string; search?: string; chandaNumber?: string }): Promise<Member[]> {
    const conditions = [isNull(members.deletedAt)]; // Exclude soft-deleted members

    if (filters?.auxiliaryBody) {
      conditions.push(eq(members.auxiliaryBody, filters.auxiliaryBody));
    }

    if (filters?.chandaNumber) {
      conditions.push(eq(members.chandaNumber, filters.chandaNumber));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        sql`${members.firstName} ILIKE ${searchTerm} OR ${members.lastName} ILIKE ${searchTerm} OR ${members.email} ILIKE ${searchTerm} OR ${members.chandaNumber} ILIKE ${searchTerm} OR ${members.username} ILIKE ${searchTerm}`
      );
    }

    const query = db.select().from(members).where(and(...conditions));

    return await query.orderBy(desc(members.createdAt));
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(insertMember).returning();
    return member;
  }

  async updateMember(id: number, updates: Partial<InsertMember>): Promise<Member | undefined> {
    const [member] = await db.update(members).set(updates).where(eq(members.id, id)).returning();
    return member || undefined;
  }

  async deleteMember(id: number): Promise<boolean> {
    // Soft delete by setting deletedAt timestamp
    const [result] = await db
      .update(members)
      .set({ deletedAt: new Date() })
      .where(and(eq(members.id, id), isNull(members.deletedAt)))
      .returning();
    return !!result;
  }

  private determineEventStatus(event: Event): string {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours later
    
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
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return undefined;
    
    const dynamicStatus = this.determineEventStatus(event);
    if (dynamicStatus !== event.status) {
      // Update status in database
      await db.update(events).set({ status: dynamicStatus }).where(eq(events.id, id));
      event.status = dynamicStatus;
    }
    
    return event;
  }

  async getEvents(filters?: { status?: string; createdBy?: number }): Promise<Event[]> {
    const conditions = [isNull(events.deletedAt)];
    
    if (filters?.createdBy) {
      conditions.push(eq(events.createdBy, filters.createdBy));
    }
    
    const allEvents = await db.select().from(events).where(and(...conditions)).orderBy(desc(events.createdAt));
    
    // Update event statuses dynamically but more efficiently
    const updatedEvents = allEvents.map(event => {
      const dynamicStatus = this.determineEventStatus(event);
      if (dynamicStatus !== event.status) {
        event.status = dynamicStatus;
      }
      return event;
    });
    
    // Apply status filter after dynamic update
    if (filters?.status) {
      return updatedEvents.filter(event => event.status === filters.status);
    }
    
    return updatedEvents;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent as any).returning();
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(updates as any).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      const deletedAt = new Date();
      
      // Soft delete the event
      const [result] = await db.update(events)
        .set({ deletedAt })
        .where(eq(events.id, id))
        .returning();
      
      if (result) {
        // Also soft delete all registrations for this event
        await db.update(eventRegistrations)
          .set({ status: 'cancelled' })
          .where(eq(eventRegistrations.eventId, id));
      }
      
      return !!result;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // Event Registrations
  async getEventRegistration(id: number): Promise<EventRegistration | undefined> {
    const results = await db.select()
      .from(eventRegistrations)
      .leftJoin(members, eq(eventRegistrations.memberId, members.id))
      .where(eq(eventRegistrations.id, id));
    
    if (results.length === 0) return undefined;
    
    const result = results[0];
    return {
      ...result.event_registrations,
      member: result.members
    } as any;
  }

  async getEventRegistrationByQR(qrCode: string): Promise<EventRegistration | undefined> {
    const [registration] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.qrCode, qrCode));
    return registration || undefined;
  }

  async getEventRegistrationByUniqueId(uniqueId: string): Promise<EventRegistration | undefined> {
    const [registration] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.uniqueId, uniqueId));
    return registration || undefined;
  }

  async getEventRegistrations(eventId?: number, filters?: { 
    auxiliaryBody?: string; 
    uniqueId?: string; 
    chandaNumber?: string; 
    startDate?: Date; 
    endDate?: Date;
    status?: string;
  }): Promise<EventRegistration[]> {
    const conditions = [];
    
    if (eventId) {
      conditions.push(eq(eventRegistrations.eventId, eventId));
    }
    
    if (filters?.auxiliaryBody) {
      conditions.push(eq(eventRegistrations.guestAuxiliaryBody, filters.auxiliaryBody));
    }
    
    if (filters?.uniqueId) {
      conditions.push(eq(eventRegistrations.uniqueId, filters.uniqueId));
    }
    
    if (filters?.chandaNumber) {
      conditions.push(eq(eventRegistrations.guestChandaNumber, filters.chandaNumber));
    }
    
    if (filters?.status) {
      conditions.push(eq(eventRegistrations.status, filters.status));
    }
    
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate) {
        conditions.push(sql`${eventRegistrations.createdAt} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${eventRegistrations.createdAt} <= ${filters.endDate}`);
      }
    }
    
    let query;
    if (conditions.length > 0) {
      query = db.select().from(eventRegistrations).where(and(...conditions));
    } else {
      query = db.select().from(eventRegistrations);
    }
    
    return await query.orderBy(desc(eventRegistrations.createdAt));
  }

  async getMemberRegistrations(memberId: number): Promise<EventRegistration[]> {
    return await db.select().from(eventRegistrations).where(eq(eventRegistrations.memberId, memberId));
  }

  async createEventRegistration(insertRegistration: InsertEventRegistration): Promise<EventRegistration> {
    const [registration] = await db.insert(eventRegistrations).values(insertRegistration).returning();
    return registration;
  }

  async updateEventRegistration(id: number, updates: Partial<InsertEventRegistration>): Promise<EventRegistration | undefined> {
    const [registration] = await db.update(eventRegistrations).set(updates).where(eq(eventRegistrations.id, id)).returning();
    return registration || undefined;
  }

  // Attendance
  async getAttendance(eventId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.eventId, eventId));
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [attendanceRecord] = await db.insert(attendance).values(insertAttendance).returning();
    return attendanceRecord;
  }

  async getAttendanceStats(): Promise<{ totalScans: number; validationRate: number; scansToday: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const [totalScansResult] = await db.select({ count: sql<number>`count(*)` }).from(attendance);
    const [validScansResult] = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(eq(attendance.validationStatus, 'valid'));
    const [todayScansResult] = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(sql`${attendance.scannedAt} >= ${todayISO}`);
    
    const totalScans = totalScansResult.count || 0;
    const validScans = validScansResult.count || 0;
    const scansToday = todayScansResult.count || 0;
    
    return {
      totalScans,
      validationRate: totalScans > 0 ? (validScans / totalScans) * 100 : 0,
      scansToday
    };
  }

  // Invitations
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id));
    return invitation || undefined;
  }

  async getEventInvitations(eventId: number): Promise<Invitation[]> {
    return await db.select().from(invitations).where(eq(invitations.eventId, eventId));
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db.insert(invitations).values(insertInvitation).returning();
    return invitation;
  }

  async updateInvitation(id: number, updates: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const [invitation] = await db.update(invitations).set(updates).where(eq(invitations.id, id)).returning();
    return invitation || undefined;
  }

  // Event Reports
  async getEventReport(id: number): Promise<EventReport | undefined> {
    const [report] = await db.select().from(eventReports).where(eq(eventReports.id, id)).limit(1);
    return report;
  }

  async getEventReports(eventId: number): Promise<EventReport[]> {
    const reports = await db.select().from(eventReports).where(eq(eventReports.eventId, eventId)).orderBy(desc(eventReports.createdAt));
    return reports;
  }

  async getAllEventReports(): Promise<EventReport[]> {
    const reports = await db.select({
      id: eventReports.id,
      eventId: eventReports.eventId,
      reporterName: eventReports.reporterName,
      reporterEmail: eventReports.reporterEmail,
      reporterPhone: eventReports.reporterPhone,
      reportType: eventReports.reportType,
      message: eventReports.message,
      status: eventReports.status,
      createdAt: eventReports.createdAt,
      reviewNotes: eventReports.reviewNotes,
      event: {
        id: events.id,
        name: events.name
      }
    })
    .from(eventReports)
    .leftJoin(events, eq(eventReports.eventId, events.id))
    .orderBy(desc(eventReports.createdAt));
    return reports;
  }

  async createEventReport(insertReport: InsertEventReport): Promise<EventReport> {
    const [report] = await db.insert(eventReports).values(insertReport).returning();
    return report;
  }

  async updateEventReport(id: number, updates: Partial<InsertEventReport>): Promise<EventReport | undefined> {
    const [report] = await db.update(eventReports).set(updates).where(eq(eventReports.id, id)).returning();
    return report || undefined;
  }

  // Member Validation CSV
  async getMemberValidationCsv(eventId: number): Promise<MemberValidationCsv[]> {
    const csvs = await db.select().from(memberValidationCsv).where(eq(memberValidationCsv.eventId, eventId)).orderBy(desc(memberValidationCsv.createdAt));
    return csvs;
  }

  async createMemberValidationCsv(insertCsv: InsertMemberValidationCsv): Promise<MemberValidationCsv> {
    const [csv] = await db.insert(memberValidationCsv).values(insertCsv as any).returning();
    return csv;
  }

  async deleteMemberValidationCsv(id: number): Promise<boolean> {
    const result = await db.delete(memberValidationCsv).where(eq(memberValidationCsv.id, id)).returning();
    return result.length > 0;
  }

  // Face Recognition Photos
  async getFaceRecognitionPhotos(eventId?: number): Promise<FaceRecognitionPhoto[]> {
    const conditions = [eq(faceRecognitionPhotos.isActive, true)];
    
    if (eventId) {
      conditions.push(eq(faceRecognitionPhotos.eventId, eventId));
    }
    
    const photos = await db.select().from(faceRecognitionPhotos)
      .where(and(...conditions))
      .orderBy(desc(faceRecognitionPhotos.createdAt));
    return photos;
  }

  async createFaceRecognitionPhoto(insertPhoto: InsertFaceRecognitionPhoto): Promise<FaceRecognitionPhoto> {
    const [photo] = await db.insert(faceRecognitionPhotos).values(insertPhoto).returning();
    return photo;
  }

  async deleteFaceRecognitionPhoto(id: number): Promise<boolean> {
    const [photo] = await db.update(faceRecognitionPhotos).set({ isActive: false }).where(eq(faceRecognitionPhotos.id, id)).returning();
    return !!photo;
  }
}

export const storage = new DatabaseStorage();
