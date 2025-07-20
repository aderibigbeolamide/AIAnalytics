-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"member_id" integer,
	"user_id" integer,
	"registration_type" text NOT NULL,
	"qr_code" text NOT NULL,
	"unique_id" text NOT NULL,
	"guest_name" text,
	"guest_email" text,
	"guest_auxiliary_body" text,
	"guest_post" text,
	"custom_field_data" jsonb DEFAULT '{}'::jsonb,
	"payment_receipt_url" text,
	"payment_amount" text,
	"payment_status" text DEFAULT 'pending',
	"payment_method" text,
	"paystack_reference" text,
	"payment_verified_at" timestamp,
	"payment_verified_by" integer,
	"status" text DEFAULT 'registered' NOT NULL,
	"validation_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_registrations_qr_code_unique" UNIQUE("qr_code"),
	CONSTRAINT "event_registrations_unique_id_unique" UNIQUE("unique_id")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"username" text NOT NULL,
	"picture" text,
	"address" text,
	"phone_number" text,
	"email" text,
	"date_of_birth" timestamp,
	"auxiliary_body" text NOT NULL,
	"post_holding" text,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "face_recognition_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"member_id" integer,
	"photo_url" text NOT NULL,
	"member_name" text NOT NULL,
	"auxiliary_body" text,
	"chanda_number" text,
	"uploaded_by" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"reporter_name" text NOT NULL,
	"reporter_email" text,
	"reporter_phone" text,
	"report_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"invitee_email" text NOT NULL,
	"invitee_name" text NOT NULL,
	"invitee_post" text,
	"invited_by" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"qr_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_validation_csv" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_by" integer NOT NULL,
	"member_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"registration_start_date" timestamp,
	"registration_end_date" timestamp,
	"eligible_auxiliary_bodies" jsonb NOT NULL,
	"allow_guests" boolean DEFAULT false,
	"requires_payment" boolean DEFAULT false,
	"payment_amount" text,
	"payment_settings" jsonb DEFAULT '{"paymentRules":{"guest":false,"member":false,"invitee":false},"paymentMethods":[],"requiresPayment":false,"allowManualReceipt":true}'::jsonb,
	"custom_registration_fields" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_by" integer NOT NULL,
	"qr_code" text,
	"report_link" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"registration_id" integer NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"scanned_by" integer,
	"validation_status" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_payment_verified_by_users_id_fk" FOREIGN KEY ("payment_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_recognition_photos" ADD CONSTRAINT "face_recognition_photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_recognition_photos" ADD CONSTRAINT "face_recognition_photos_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_recognition_photos" ADD CONSTRAINT "face_recognition_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_validation_csv" ADD CONSTRAINT "member_validation_csv_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_validation_csv" ADD CONSTRAINT "member_validation_csv_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
*/