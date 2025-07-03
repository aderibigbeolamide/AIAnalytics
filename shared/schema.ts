import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("member"), // admin, member, guest, invitee
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  picture: text("picture"),
  jamaat: text("jamaat").notNull(),
  circuit: text("circuit"),
  chandaNumber: text("chanda_number").unique(),
  wasiyyahNumber: text("wasiyyah_number"),
  address: text("address"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  dateOfBirth: timestamp("date_of_birth"),
  auxiliaryBody: text("auxiliary_body").notNull(), // Atfal, Khuddam, Lajna, Ansarullah, Nasra
  postHolding: text("post_holding"),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  eligibleAuxiliaryBodies: jsonb("eligible_auxiliary_bodies").$type<string[]>().notNull(),
  allowGuests: boolean("allow_guests").default(false),
  status: text("status").notNull().default("upcoming"), // upcoming, active, completed, cancelled
  createdBy: integer("created_by").references(() => users.id).notNull(),
  qrCode: text("qr_code"),
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
  uniqueId: text("unique_id").notNull().unique(), // For manual validation
  
  // Guest/Invitee fields
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestJamaat: text("guest_jamaat"),
  guestAuxiliaryBody: text("guest_auxiliary_body"),
  guestChandaNumber: text("guest_chanda_number"),
  guestCircuit: text("guest_circuit"),
  guestPost: text("guest_post"), // Optional post for invitees
  
  status: text("status").notNull().default("registered"), // registered, attended, cancelled
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
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'resolved'
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Types
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

export type InsertEventReport = z.infer<typeof insertEventReportSchema>;
export type EventReport = typeof eventReports.$inferSelect;
