import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom form field type for flexible registration forms
export interface CustomFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helperText?: string;
  conditionalLogic?: {
    showWhen: string; // field id
    equals: string; // value
  };
  // New conditional fields for registration types
  requiredForTypes?: string[]; // Array of registration types where this field is required
  visibleForTypes?: string[]; // Array of registration types where this field is visible
  conditionalRequired?: {
    member?: boolean;
    guest?: boolean;
    invitee?: boolean;
  };
  conditionalVisible?: {
    member?: boolean;
    guest?: boolean;
    invitee?: boolean;
  };
}

// Organizations table for multi-tenant support
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  contactEmail: text("contact_email").notNull().unique(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  website: text("website"),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("pending"), // pending, approved, suspended, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  subscriptionPlan: text("subscription_plan").notNull().default("basic"), // basic, premium, enterprise
  subscriptionStatus: text("subscription_status").notNull().default("active"), // active, suspended, cancelled
  maxEvents: integer("max_events").notNull().default(10),
  maxMembers: integer("max_members").notNull().default(500),
  settings: jsonb("settings").default({}).notNull(),
  // Paystack subaccount for receiving payments
  paystackSubaccountCode: text("paystack_subaccount_code"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  bankCode: text("bank_code"),
  businessName: text("business_name"),
  businessEmail: text("business_email"),
  businessPhone: text("business_phone"),
  settlementBank: text("settlement_bank"),
  percentageCharge: integer("percentage_charge").default(0),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("member"), // super_admin, admin, member, guest, invitee
  status: text("status").notNull().default("active"), // active, suspended, inactive
  profilePicture: text("profile_picture"),
  phoneNumber: text("phone_number"),
  lastLogin: timestamp("last_login"),
  passwordChangedAt: timestamp("password_changed_at"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  picture: text("picture"),
  address: text("address"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  dateOfBirth: timestamp("date_of_birth"),
  auxiliaryBody: text("auxiliary_body").notNull(), // Dynamic based on event eligibility
  postHolding: text("post_holding"),
  status: text("status").notNull().default("active"), // active, inactive
  deletedAt: timestamp("deleted_at"), // Soft delete field
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  registrationStartDate: timestamp("registration_start_date"),
  registrationEndDate: timestamp("registration_end_date"),
  eligibleAuxiliaryBodies: jsonb("eligible_auxiliary_bodies").$type<string[]>().notNull(),
  allowGuests: boolean("allow_guests").default(false),
  requiresPayment: boolean("requires_payment").default(false),
  paymentAmount: text("payment_amount"),
  // New field to distinguish event types
  eventType: text("event_type").notNull().default("registration"), // "registration" or "ticket"
  
  // Ticket Categories for ticket-based events
  ticketCategories: jsonb("ticket_categories").$type<Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    description?: string;
    maxQuantity?: number;
    available: boolean;
  }>>().default([]),
  paymentSettings: jsonb("payment_settings").$type<{
    requiresPayment: boolean;
    amount?: string;
    currency?: string;
    paymentMethods: string[]; // ['paystack', 'manual_receipt']
    paymentRules: {
      member: boolean;
      guest: boolean;
      invitee: boolean;
    };
    paystackPublicKey?: string;
    allowManualReceipt: boolean;
    paymentDescription?: string;
    // Multi-tenant payment settings
    useOrganizerAccount: boolean; // If true, payments go to event organizer's account
    platformFeePercentage?: number; // Platform fee (0-20) - Revenue sharing with platform owner
    splitPayment?: boolean; // Enable payment splitting
  }>().default({
    requiresPayment: false,
    paymentMethods: [],
    paymentRules: { member: false, guest: false, invitee: false },
    allowManualReceipt: true,
    useOrganizerAccount: false,
    platformFeePercentage: 2, // Default 2% platform fee for revenue sharing
    splitPayment: false
  }),
  customRegistrationFields: jsonb("custom_registration_fields").$type<CustomFormField[]>().default([]),
  status: text("status").notNull().default("upcoming"), // upcoming, active, completed, cancelled
  createdBy: integer("created_by").references(() => users.id).notNull(),
  qrCode: text("qr_code"),
  reportLink: text("report_link"), // Public report form link
  deletedAt: timestamp("deleted_at"), // Soft delete field
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  memberId: integer("member_id").references(() => members.id),
  userId: integer("user_id").references(() => users.id),
  registrationType: text("registration_type").notNull(), // member, guest, invitee
  qrCode: text("qr_code").notNull().unique(),
  uniqueId: text("unique_id").notNull().unique(), // For manual validation (shortened)
  
  // Guest/Invitee fields
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestAuxiliaryBody: text("guest_auxiliary_body"),
  guestPost: text("guest_post"), // Optional post for invitees
  
  // Custom form field data
  customFieldData: jsonb("custom_field_data").$type<Record<string, any>>().default({}),
  
  // Payment information
  paymentReceiptUrl: text("payment_receipt_url"),
  paymentAmount: text("payment_amount"),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, verified, rejected
  paymentMethod: text("payment_method"), // paystack, manual_receipt
  paystackReference: text("paystack_reference"), // Paystack transaction reference
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentVerifiedBy: integer("payment_verified_by").references(() => users.id),
  
  status: text("status").notNull().default("registered"), // registered, online, attended, cancelled
  validationMethod: text("validation_method"), // qr_code, manual_id, face_recognition, csv_verification
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  registrationId: integer("registration_id").references(() => eventRegistrations.id).notNull(),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
  scannedBy: integer("scanned_by").references(() => users.id),
  validationStatus: text("validation_status").notNull(), // valid, invalid, suspicious
  notes: text("notes"),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeName: text("invitee_name").notNull(),
  inviteePost: text("invitee_post"), // Post assigned to the invitee
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventReports = pgTable("event_reports", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterEmail: text("reporter_email"),
  reporterPhone: text("reporter_phone"),
  reportType: text("report_type").notNull(), // 'complaint', 'suggestion', 'observation'
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'closed'
  reviewNotes: text("review_notes"), // Admin review notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberValidationCsv = pgTable("member_validation_csv", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  fileName: text("file_name").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  memberData: jsonb("member_data").$type<{
    name: string;
    email?: string;
    chandaNumber?: string;
    auxiliaryBody?: string;
    [key: string]: any;
  }[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const faceRecognitionPhotos = pgTable("face_recognition_photos", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id),
  memberId: integer("member_id").references(() => members.id),
  photoUrl: text("photo_url").notNull(),
  memberName: text("member_name").notNull(),
  auxiliaryBody: text("auxiliary_body"),
  chandaNumber: text("chanda_number"),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Real-time seat availability and event recommendation tables
export const eventCapacity = pgTable("event_capacity", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  seatMap: jsonb("seat_map").$type<{
    sections: Array<{
      id: string;
      name: string;
      seats: Array<{
        id: string;
        row: string;
        number: string;
        status: 'available' | 'reserved' | 'occupied' | 'blocked';
        price?: number;
        category?: string;
      }>;
    }>;
  }>(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  preferences: jsonb("preferences").$type<{
    auxiliaryBodies: string[];
    eventTypes: string[];
    locations: string[];
    timePreferences: string[];
    interests: string[];
    priceRange: { min: number; max: number };
    notificationSettings: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  }>().default({
    auxiliaryBodies: [],
    eventTypes: [],
    locations: [],
    timePreferences: [],
    interests: [],
    priceRange: { min: 0, max: 10000 },
    notificationSettings: { email: true, sms: false, push: true }
  }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventRecommendations = pgTable("event_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  score: integer("score").notNull(), // 0-100 recommendation score
  reasons: jsonb("reasons").$type<string[]>().default([]),
  status: text("status").default("pending"), // pending, viewed, registered, ignored
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Behavior Tracking Tables for AI-Powered Recommendations
export const userSearchHistory = pgTable("user_search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // Track anonymous users
  searchQuery: text("search_query").notNull(),
  resultsCount: integer("results_count").default(0),
  clickedEventId: integer("clicked_event_id").references(() => events.id),
  searchContext: jsonb("search_context").$type<{
    location?: string;
    timeOfDay: string;
    dayOfWeek: string;
    userAgent?: string;
    referrer?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userEventInteractions = pgTable("user_event_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // Track anonymous users  
  eventId: integer("event_id").references(() => events.id).notNull(),
  interactionType: text("interaction_type").notNull(), // view, click, share, bookmark, register
  timeSpent: integer("time_spent"), // seconds spent viewing
  source: text("source"), // search, recommendation, direct, browse
  deviceType: text("device_type"), // mobile, desktop, tablet
  interactionContext: jsonb("interaction_context").$type<{
    fromSearch?: boolean;
    searchQuery?: string;
    recommendationScore?: number;
    scrollDepth?: number;
    clickPosition?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userBehaviorPatterns = pgTable("user_behavior_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  patterns: jsonb("patterns").$type<{
    preferredEventTypes: Array<{ type: string; weight: number }>;
    preferredLocations: Array<{ location: string; weight: number }>;
    preferredTimeSlots: Array<{ timeSlot: string; weight: number }>;
    searchKeywords: Array<{ keyword: string; frequency: number }>;
    attendanceHistory: Array<{ eventType: string; attended: boolean; rating?: number }>;
    engagementScore: number; // 0-100 overall engagement
    personalityProfile: {
      explorationVsExploitation: number; // 0-100, how likely to try new vs familiar
      pricesensitivity: number; // 0-100
      socialPreference: number; // 0-100, prefers group vs solo events
      planningHorizon: number; // 0-100, books events how far in advance
    };
  }>(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRecommendationFeedback = pgTable("user_recommendation_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  recommendationId: integer("recommendation_id").references(() => eventRecommendations.id).notNull(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  feedbackType: text("feedback_type").notNull(), // like, dislike, not_interested, report, registered
  feedbackReason: text("feedback_reason"), // too_expensive, wrong_location, not_my_interest, etc.
  implicitFeedback: jsonb("implicit_feedback").$type<{
    timeToAction?: number; // ms from recommendation shown to action
    viewDuration?: number; // seconds spent viewing recommendation
    clickedThrough?: boolean;
    shareAction?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New Ticket System Tables
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  ticketNumber: text("ticket_number").notNull().unique(), // e.g., TICKET-001
  qrCode: text("qr_code").notNull().unique(),
  
  // Ticket Information
  ticketType: text("ticket_type").notNull(), // VIP, Regular, Student, etc.
  ticketCategoryId: text("ticket_category_id").notNull(), // Reference to event's ticket category
  price: text("price").notNull(),
  currency: text("currency").default("NGN"),
  
  // Current Owner Information
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  ownerPhone: text("owner_phone"),
  
  // Additional Fields from Purchase
  additionalInfo: jsonb("additional_info").$type<Record<string, any>>().default({}),
  
  // Payment Information
  paymentStatus: text("payment_status").default("pending"), // pending, paid, refunded
  paymentMethod: text("payment_method"), // paystack, manual, transfer
  paymentReference: text("payment_reference"),
  paymentAmount: text("payment_amount"),
  
  // Ticket Status
  status: text("status").notNull().default("active"), // active, used, expired, cancelled, transferred
  usedAt: timestamp("used_at"),
  scannedBy: integer("scanned_by").references(() => users.id),
  
  // Transfer Information
  isTransferable: boolean("is_transferable").default(true),
  transferCount: integer("transfer_count").default(0),
  maxTransfers: integer("max_transfers").default(5),
  
  // Metadata
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Ticket expiration
});

export const ticketTransfers = pgTable("ticket_transfers", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  
  // Previous Owner
  fromOwnerName: text("from_owner_name").notNull(),
  fromOwnerEmail: text("from_owner_email").notNull(),
  fromOwnerPhone: text("from_owner_phone"),
  
  // New Owner
  toOwnerName: text("to_owner_name").notNull(),
  toOwnerEmail: text("to_owner_email").notNull(),
  toOwnerPhone: text("to_owner_phone"),
  
  // Transfer Details
  transferPrice: text("transfer_price"), // Price if sold
  transferReason: text("transfer_reason"), // Optional reason
  transferMethod: text("transfer_method").default("direct"), // direct, marketplace
  
  // Status
  transferStatus: text("transfer_status").default("completed"), // pending, completed, cancelled
  transferredAt: timestamp("transferred_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  member: one(members, { fields: [users.id], references: [members.userId] }),
  createdEvents: many(events),
  eventRegistrations: many(eventRegistrations),
  scannedAttendance: many(attendance),
  sentInvitations: many(invitations),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
  eventRegistrations: many(eventRegistrations),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
  registrations: many(eventRegistrations),
  attendance: many(attendance),
  invitations: many(invitations),
  reports: many(eventReports),
  validationCsvs: many(memberValidationCsv),
  faceRecognitionPhotos: many(faceRecognitionPhotos),
  tickets: many(tickets),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one, many }) => ({
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  member: one(members, { fields: [eventRegistrations.memberId], references: [members.id] }),
  user: one(users, { fields: [eventRegistrations.userId], references: [users.id] }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  event: one(events, { fields: [attendance.eventId], references: [events.id] }),
  registration: one(eventRegistrations, { fields: [attendance.registrationId], references: [eventRegistrations.id] }),
  scannedBy: one(users, { fields: [attendance.scannedBy], references: [users.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  event: one(events, { fields: [invitations.eventId], references: [events.id] }),
  invitedBy: one(users, { fields: [invitations.invitedBy], references: [users.id] }),
}));

export const eventReportsRelations = relations(eventReports, ({ one }) => ({
  event: one(events, { fields: [eventReports.eventId], references: [events.id] }),
}));

export const memberValidationCsvRelations = relations(memberValidationCsv, ({ one }) => ({
  event: one(events, { fields: [memberValidationCsv.eventId], references: [events.id] }),
  uploadedBy: one(users, { fields: [memberValidationCsv.uploadedBy], references: [users.id] }),
}));

export const faceRecognitionPhotosRelations = relations(faceRecognitionPhotos, ({ one }) => ({
  event: one(events, { fields: [faceRecognitionPhotos.eventId], references: [events.id] }),
  member: one(members, { fields: [faceRecognitionPhotos.memberId], references: [members.id] }),
  uploadedBy: one(users, { fields: [faceRecognitionPhotos.uploadedBy], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  event: one(events, { fields: [tickets.eventId], references: [events.id] }),
  createdBy: one(users, { fields: [tickets.createdBy], references: [users.id] }),
  scannedBy: one(users, { fields: [tickets.scannedBy], references: [users.id] }),
  transfers: many(ticketTransfers),
}));

export const ticketTransfersRelations = relations(ticketTransfers, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketTransfers.ticketId], references: [tickets.id] }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  qrCode: true,
});

export const updateEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  scannedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  qrCode: true,
});

// Organization schema
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
});

// Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export const insertEventReportSchema = createInsertSchema(eventReports).omit({
  id: true,
  createdAt: true,
});

export const insertMemberValidationCsvSchema = createInsertSchema(memberValidationCsv).omit({
  id: true,
  createdAt: true,
});

export const insertFaceRecognitionPhotoSchema = createInsertSchema(faceRecognitionPhotos).omit({
  id: true,
  createdAt: true,
});

export type InsertEventReport = z.infer<typeof insertEventReportSchema>;
export type EventReport = typeof eventReports.$inferSelect;

export type InsertMemberValidationCsv = z.infer<typeof insertMemberValidationCsvSchema>;
export type MemberValidationCsv = typeof memberValidationCsv.$inferSelect;

export type InsertFaceRecognitionPhoto = z.infer<typeof insertFaceRecognitionPhotoSchema>;
export type FaceRecognitionPhoto = typeof faceRecognitionPhotos.$inferSelect;

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  qrCode: true,
  ticketNumber: true,
});

export const insertTicketTransferSchema = createInsertSchema(ticketTransfers).omit({
  id: true,
  transferredAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertTicketTransfer = z.infer<typeof insertTicketTransferSchema>;
export type TicketTransfer = typeof ticketTransfers.$inferSelect;

// Event Capacity schemas and types
export const insertEventCapacitySchema = createInsertSchema(eventCapacity).omit({
  id: true,
  lastUpdated: true,
});

export type InsertEventCapacity = z.infer<typeof insertEventCapacitySchema>;
export type EventCapacity = typeof eventCapacity.$inferSelect;

// User Preferences schemas and types
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// Event Recommendations schemas and types
export const insertEventRecommendationSchema = createInsertSchema(eventRecommendations).omit({
  id: true,
  createdAt: true,
});

export type InsertEventRecommendation = z.infer<typeof insertEventRecommendationSchema>;
export type EventRecommendation = typeof eventRecommendations.$inferSelect;

// User Behavior Tracking schemas and types
export const insertUserSearchHistorySchema = createInsertSchema(userSearchHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertUserSearchHistory = z.infer<typeof insertUserSearchHistorySchema>;
export type UserSearchHistory = typeof userSearchHistory.$inferSelect;

export const insertUserEventInteractionSchema = createInsertSchema(userEventInteractions).omit({
  id: true,
  createdAt: true,
});

export type InsertUserEventInteraction = z.infer<typeof insertUserEventInteractionSchema>;
export type UserEventInteraction = typeof userEventInteractions.$inferSelect;

export const insertUserBehaviorPatternSchema = createInsertSchema(userBehaviorPatterns).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertUserBehaviorPattern = z.infer<typeof insertUserBehaviorPatternSchema>;
export type UserBehaviorPattern = typeof userBehaviorPatterns.$inferSelect;

export const insertUserRecommendationFeedbackSchema = createInsertSchema(userRecommendationFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertUserRecommendationFeedback = z.infer<typeof insertUserRecommendationFeedbackSchema>;
export type UserRecommendationFeedback = typeof userRecommendationFeedback.$inferSelect;
