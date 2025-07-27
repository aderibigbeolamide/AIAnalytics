import { pgTable, foreignKey, unique, serial, integer, text, jsonb, timestamp, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const eventRegistrations = pgTable("event_registrations", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        memberId: integer("member_id"),
        userId: integer("user_id"),
        registrationType: text("registration_type").notNull(),
        qrCode: text("qr_code").notNull(),
        uniqueId: text("unique_id").notNull(),
        guestName: text("guest_name"),
        guestEmail: text("guest_email"),
        guestAuxiliaryBody: text("guest_auxiliary_body"),
        guestPost: text("guest_post"),
        customFieldData: jsonb("custom_field_data").default({}),
        paymentReceiptUrl: text("payment_receipt_url"),
        paymentAmount: text("payment_amount"),
        paymentStatus: text("payment_status").default('pending'),
        paymentMethod: text("payment_method"),
        paystackReference: text("paystack_reference"),
        paymentVerifiedAt: timestamp("payment_verified_at", { mode: 'string' }),
        paymentVerifiedBy: integer("payment_verified_by"),
        status: text().default('registered').notNull(),
        validationMethod: text("validation_method"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "event_registrations_event_id_events_id_fk"
                }),
        foreignKey({
                        columns: [table.memberId],
                        foreignColumns: [members.id],
                        name: "event_registrations_member_id_members_id_fk"
                }),
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "event_registrations_user_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.paymentVerifiedBy],
                        foreignColumns: [users.id],
                        name: "event_registrations_payment_verified_by_users_id_fk"
                }),
        unique("event_registrations_qr_code_unique").on(table.qrCode),
        unique("event_registrations_unique_id_unique").on(table.uniqueId),
]);

export const members = pgTable("members", {
        id: serial().primaryKey().notNull(),
        userId: integer("user_id"),
        firstName: text("first_name").notNull(),
        middleName: text("middle_name"),
        lastName: text("last_name").notNull(),
        username: text().notNull(),
        picture: text(),
        address: text(),
        phoneNumber: text("phone_number"),
        email: text(),
        dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
        auxiliaryBody: text("auxiliary_body").notNull(),
        postHolding: text("post_holding"),
        status: text().default('active').notNull(),
        deletedAt: timestamp("deleted_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "members_user_id_users_id_fk"
                }),
        unique("members_username_unique").on(table.username),
]);

export const faceRecognitionPhotos = pgTable("face_recognition_photos", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id"),
        memberId: integer("member_id"),
        photoUrl: text("photo_url").notNull(),
        memberName: text("member_name").notNull(),
        auxiliaryBody: text("auxiliary_body"),
        chandaNumber: text("chanda_number"),
        uploadedBy: integer("uploaded_by").notNull(),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "face_recognition_photos_event_id_events_id_fk"
                }),
        foreignKey({
                        columns: [table.memberId],
                        foreignColumns: [members.id],
                        name: "face_recognition_photos_member_id_members_id_fk"
                }),
        foreignKey({
                        columns: [table.uploadedBy],
                        foreignColumns: [users.id],
                        name: "face_recognition_photos_uploaded_by_users_id_fk"
                }),
]);

export const eventReports = pgTable("event_reports", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        reporterName: text("reporter_name").notNull(),
        reporterEmail: text("reporter_email"),
        reporterPhone: text("reporter_phone"),
        reportType: text("report_type").notNull(),
        message: text().notNull(),
        status: text().default('pending').notNull(),
        reviewNotes: text("review_notes"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "event_reports_event_id_events_id_fk"
                }),
]);

export const invitations = pgTable("invitations", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        inviteeEmail: text("invitee_email").notNull(),
        inviteeName: text("invitee_name").notNull(),
        inviteePost: text("invitee_post"),
        invitedBy: integer("invited_by").notNull(),
        status: text().default('pending').notNull(),
        qrCode: text("qr_code"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "invitations_event_id_events_id_fk"
                }),
        foreignKey({
                        columns: [table.invitedBy],
                        foreignColumns: [users.id],
                        name: "invitations_invited_by_users_id_fk"
                }),
]);

export const memberValidationCsv = pgTable("member_validation_csv", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        fileName: text("file_name").notNull(),
        uploadedBy: integer("uploaded_by").notNull(),
        memberData: jsonb("member_data").notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "member_validation_csv_event_id_events_id_fk"
                }),
        foreignKey({
                        columns: [table.uploadedBy],
                        foreignColumns: [users.id],
                        name: "member_validation_csv_uploaded_by_users_id_fk"
                }),
]);

export const events = pgTable("events", {
        id: serial().primaryKey().notNull(),
        organizationId: integer("organization_id").notNull(),
        name: text().notNull(),
        description: text(),
        location: text().notNull(),
        startDate: timestamp("start_date", { mode: 'string' }).notNull(),
        endDate: timestamp("end_date", { mode: 'string' }),
        registrationStartDate: timestamp("registration_start_date", { mode: 'string' }),
        registrationEndDate: timestamp("registration_end_date", { mode: 'string' }),
        eligibleAuxiliaryBodies: jsonb("eligible_auxiliary_bodies").notNull(),
        allowGuests: boolean("allow_guests").default(false),
        requiresPayment: boolean("requires_payment").default(false),
        paymentAmount: text("payment_amount"),
        paymentSettings: jsonb("payment_settings").default({"paymentRules":{"guest":false,"member":false,"invitee":false},"paymentMethods":[],"requiresPayment":false,"allowManualReceipt":true}),
        customRegistrationFields: jsonb("custom_registration_fields").default([]),
        status: text().default('upcoming').notNull(),
        createdBy: integer("created_by").notNull(),
        qrCode: text("qr_code"),
        reportLink: text("report_link"),
        deletedAt: timestamp("deleted_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.createdBy],
                        foreignColumns: [users.id],
                        name: "events_created_by_users_id_fk"
                }),
]);

export const attendance = pgTable("attendance", {
        id: serial().primaryKey().notNull(),
        eventId: integer("event_id").notNull(),
        registrationId: integer("registration_id").notNull(),
        scannedAt: timestamp("scanned_at", { mode: 'string' }).defaultNow().notNull(),
        scannedBy: integer("scanned_by"),
        validationStatus: text("validation_status").notNull(),
        notes: text(),
}, (table) => [
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "attendance_event_id_events_id_fk"
                }),
        foreignKey({
                        columns: [table.registrationId],
                        foreignColumns: [eventRegistrations.id],
                        name: "attendance_registration_id_event_registrations_id_fk"
                }),
        foreignKey({
                        columns: [table.scannedBy],
                        foreignColumns: [users.id],
                        name: "attendance_scanned_by_users_id_fk"
                }),
]);

// Organizations table for multi-tenant support
export const organizations = pgTable("organizations", {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        contactEmail: text("contact_email").notNull(),
        contactPhone: text("contact_phone"),
        address: text(),
        website: text(),
        logoUrl: text("logo_url"),
        status: text().default('pending').notNull(), // pending, approved, suspended, rejected
        approvedBy: integer("approved_by"),
        approvedAt: timestamp("approved_at", { mode: 'string' }),
        rejectionReason: text("rejection_reason"),
        subscriptionPlan: text("subscription_plan").default('basic').notNull(), // basic, premium, enterprise
        subscriptionStatus: text("subscription_status").default('active').notNull(), // active, suspended, cancelled
        maxEvents: integer("max_events").default(10).notNull(),
        maxMembers: integer("max_members").default(500).notNull(),
        settings: jsonb().default({}).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("organizations_contact_email_unique").on(table.contactEmail),
        foreignKey({
                columns: [table.approvedBy],
                foreignColumns: [users.id],
                name: "organizations_approved_by_users_id_fk"
        }),
]);

export const users = pgTable("users", {
        id: serial().primaryKey().notNull(),
        organizationId: integer("organization_id"),
        username: text().notNull(),
        email: text().notNull(),
        password: text().notNull(),
        firstName: text("first_name"),
        lastName: text("last_name"),
        role: text().default('member').notNull(), // super_admin, admin, member, guest, invitee
        status: text().default('active').notNull(), // active, suspended, inactive
        profilePicture: text("profile_picture"),
        phoneNumber: text("phone_number"),
        lastLogin: timestamp("last_login", { mode: 'string' }),
        passwordChangedAt: timestamp("password_changed_at", { mode: 'string' }),
        twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
        twoFactorSecret: text("two_factor_secret"),
        resetPasswordToken: text("reset_password_token"),
        resetPasswordExpires: timestamp("reset_password_expires", { mode: 'string' }),
        emailVerified: boolean("email_verified").default(false).notNull(),
        emailVerificationToken: text("email_verification_token"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("users_username_unique").on(table.username),
        unique("users_email_unique").on(table.email),
        foreignKey({
                columns: [table.organizationId],
                foreignColumns: [organizations.id],
                name: "users_organization_id_organizations_id_fk"
        }),
]);

// Organization Activity Log for super admin oversight
export const organizationActivityLog = pgTable("organization_activity_log", {
        id: serial().primaryKey().notNull(),
        organizationId: integer("organization_id").notNull(),
        userId: integer("user_id"),
        action: text().notNull(), // login, event_created, member_added, settings_changed, etc.
        entityType: text("entity_type"), // event, member, user, settings
        entityId: integer("entity_id"),
        details: jsonb().default({}).notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                columns: [table.organizationId],
                foreignColumns: [organizations.id],
                name: "organization_activity_log_organization_id_organizations_id_fk"
        }),
        foreignKey({
                columns: [table.userId],
                foreignColumns: [users.id],
                name: "organization_activity_log_user_id_users_id_fk"
        }),
]);

// Platform Statistics for super admin dashboard
export const platformStatistics = pgTable("platform_statistics", {
        id: serial().primaryKey().notNull(),
        date: timestamp({ mode: 'string' }).notNull(),
        totalOrganizations: integer("total_organizations").default(0).notNull(),
        activeOrganizations: integer("active_organizations").default(0).notNull(),
        pendingOrganizations: integer("pending_organizations").default(0).notNull(),
        totalUsers: integer("total_users").default(0).notNull(),
        activeUsers: integer("active_users").default(0).notNull(),
        totalEvents: integer("total_events").default(0).notNull(),
        activeEvents: integer("active_events").default(0).notNull(),
        totalRegistrations: integer("total_registrations").default(0).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
