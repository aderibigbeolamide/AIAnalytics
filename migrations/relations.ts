import { relations } from "drizzle-orm/relations";
import { events, eventRegistrations, members, users, faceRecognitionPhotos, eventReports, invitations, memberValidationCsv, attendance } from "./schema";

export const eventRegistrationsRelations = relations(eventRegistrations, ({one, many}) => ({
	event: one(events, {
		fields: [eventRegistrations.eventId],
		references: [events.id]
	}),
	member: one(members, {
		fields: [eventRegistrations.memberId],
		references: [members.id]
	}),
	user_userId: one(users, {
		fields: [eventRegistrations.userId],
		references: [users.id],
		relationName: "eventRegistrations_userId_users_id"
	}),
	user_paymentVerifiedBy: one(users, {
		fields: [eventRegistrations.paymentVerifiedBy],
		references: [users.id],
		relationName: "eventRegistrations_paymentVerifiedBy_users_id"
	}),
	attendances: many(attendance),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	eventRegistrations: many(eventRegistrations),
	faceRecognitionPhotos: many(faceRecognitionPhotos),
	eventReports: many(eventReports),
	invitations: many(invitations),
	memberValidationCsvs: many(memberValidationCsv),
	user: one(users, {
		fields: [events.createdBy],
		references: [users.id]
	}),
	attendances: many(attendance),
}));

export const membersRelations = relations(members, ({one, many}) => ({
	eventRegistrations: many(eventRegistrations),
	user: one(users, {
		fields: [members.userId],
		references: [users.id]
	}),
	faceRecognitionPhotos: many(faceRecognitionPhotos),
}));

export const usersRelations = relations(users, ({many}) => ({
	eventRegistrations_userId: many(eventRegistrations, {
		relationName: "eventRegistrations_userId_users_id"
	}),
	eventRegistrations_paymentVerifiedBy: many(eventRegistrations, {
		relationName: "eventRegistrations_paymentVerifiedBy_users_id"
	}),
	members: many(members),
	faceRecognitionPhotos: many(faceRecognitionPhotos),
	invitations: many(invitations),
	memberValidationCsvs: many(memberValidationCsv),
	events: many(events),
	attendances: many(attendance),
}));

export const faceRecognitionPhotosRelations = relations(faceRecognitionPhotos, ({one}) => ({
	event: one(events, {
		fields: [faceRecognitionPhotos.eventId],
		references: [events.id]
	}),
	member: one(members, {
		fields: [faceRecognitionPhotos.memberId],
		references: [members.id]
	}),
	user: one(users, {
		fields: [faceRecognitionPhotos.uploadedBy],
		references: [users.id]
	}),
}));

export const eventReportsRelations = relations(eventReports, ({one}) => ({
	event: one(events, {
		fields: [eventReports.eventId],
		references: [events.id]
	}),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	event: one(events, {
		fields: [invitations.eventId],
		references: [events.id]
	}),
	user: one(users, {
		fields: [invitations.invitedBy],
		references: [users.id]
	}),
}));

export const memberValidationCsvRelations = relations(memberValidationCsv, ({one}) => ({
	event: one(events, {
		fields: [memberValidationCsv.eventId],
		references: [events.id]
	}),
	user: one(users, {
		fields: [memberValidationCsv.uploadedBy],
		references: [users.id]
	}),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	event: one(events, {
		fields: [attendance.eventId],
		references: [events.id]
	}),
	eventRegistration: one(eventRegistrations, {
		fields: [attendance.registrationId],
		references: [eventRegistrations.id]
	}),
	user: one(users, {
		fields: [attendance.scannedBy],
		references: [users.id]
	}),
}));