import { 
  type User, type InsertUser, type Member, type InsertMember,
  type Event, type InsertEvent, type EventRegistration, type InsertEventRegistration,
  type Attendance, type InsertAttendance, type Invitation, type InsertInvitation,
  type EventReport, type InsertEventReport, type MemberValidationCsv, type InsertMemberValidationCsv,
  type FaceRecognitionPhoto, type InsertFaceRecognitionPhoto
} from "@shared/schema";

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
    chandaNumber?: string; 
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
    
    if (filters?.chandaNumber) {
      registrationList = registrationList.filter(reg => 
        reg.customFieldData?.chandaNumber === filters.chandaNumber
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
}

export const storage = new MemStorage();
