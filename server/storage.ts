import { 
  users, members, events, eventRegistrations, attendance, invitations,
  type User, type InsertUser, type Member, type InsertMember,
  type Event, type InsertEvent, type EventRegistration, type InsertEventRegistration,
  type Attendance, type InsertAttendance, type Invitation, type InsertInvitation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, like, ilike } from "drizzle-orm";

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
  getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, updates: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;

  // Events
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(filters?: { status?: string; createdBy?: number }): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // Event Registrations
  getEventRegistration(id: number): Promise<EventRegistration | undefined>;
  getEventRegistrationByQR(qrCode: string): Promise<EventRegistration | undefined>;
  getEventRegistrations(eventId: number): Promise<EventRegistration[]>;
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

  async getMembers(filters?: { auxiliaryBody?: string; search?: string }): Promise<Member[]> {
    let query = db.select().from(members);
    
    if (filters?.auxiliaryBody) {
      query = query.where(eq(members.auxiliaryBody, filters.auxiliaryBody));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        sql`${members.firstName} ILIKE ${searchTerm} OR ${members.lastName} ILIKE ${searchTerm} OR ${members.email} ILIKE ${searchTerm} OR ${members.chandaNumber} ILIKE ${searchTerm}`
      );
    }
    
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
    const result = await db.delete(members).where(eq(members.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEvents(filters?: { status?: string; createdBy?: number }): Promise<Event[]> {
    let query = db.select().from(events);
    
    if (filters?.status) {
      query = query.where(eq(events.status, filters.status));
    }
    
    if (filters?.createdBy) {
      query = query.where(eq(events.createdBy, filters.createdBy));
    }
    
    return await query.orderBy(desc(events.createdAt));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount || 0) > 0;
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

  async getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
    return await db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId));
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
    
    const [totalScansResult] = await db.select({ count: sql<number>`count(*)` }).from(attendance);
    const [validScansResult] = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(eq(attendance.validationStatus, 'valid'));
    const [todayScansResult] = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(sql`${attendance.scannedAt} >= ${today}`);
    
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
}

export const storage = new DatabaseStorage();
