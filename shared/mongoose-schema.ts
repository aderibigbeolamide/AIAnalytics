import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

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

// Organization Schema
export interface IOrganization extends Document {
  name: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  status: string; // pending, approved, suspended, rejected
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  subscriptionPlan: string; // basic, premium, enterprise
  subscriptionStatus: string; // active, suspended, cancelled
  maxEvents: number;
  maxMembers: number;
  settings: any;
  // Paystack subaccount for receiving payments
  paystackSubaccountCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankCode?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  settlementBank?: string;
  percentageCharge?: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  description: { type: String },
  contactEmail: { type: String, required: true, unique: true },
  contactPhone: { type: String },
  address: { type: String },
  website: { type: String },
  logoUrl: { type: String },
  status: { type: String, required: true, default: "pending" },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  subscriptionPlan: { type: String, required: true, default: "basic" },
  subscriptionStatus: { type: String, required: true, default: "active" },
  maxEvents: { type: Number, required: true, default: 10 },
  maxMembers: { type: Number, required: true, default: 500 },
  settings: { type: Schema.Types.Mixed, default: {} },
  paystackSubaccountCode: { type: String },
  bankName: { type: String },
  accountNumber: { type: String },
  accountName: { type: String },
  bankCode: { type: String },
  businessName: { type: String },
  businessEmail: { type: String },
  businessPhone: { type: String },
  settlementBank: { type: String },
  percentageCharge: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

// User Schema
export interface IUser extends Document {
  organizationId?: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: string; // super_admin, admin, member, guest, invitee
  status: string; // active, suspended, inactive
  profilePicture?: string;
  phoneNumber?: string;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  // Bank account fields
  paystackSubaccountCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankCode?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  percentageCharge?: number;
  isVerified?: boolean;
  // Organization profile fields
  phone?: string;
  address?: string;
  description?: string;
  website?: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, required: true, default: "member" },
  status: { type: String, required: true, default: "active" },
  profilePicture: { type: String },
  phoneNumber: { type: String },
  lastLogin: { type: Date },
  passwordChangedAt: { type: Date },
  twoFactorEnabled: { type: Boolean, required: true, default: false },
  twoFactorSecret: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  emailVerified: { type: Boolean, required: true, default: false },
  emailVerificationToken: { type: String },
  // Bank account fields
  paystackSubaccountCode: { type: String },
  bankName: { type: String },
  accountNumber: { type: String },
  accountName: { type: String },
  bankCode: { type: String },
  businessName: { type: String },
  businessEmail: { type: String },
  businessPhone: { type: String },
  percentageCharge: { type: Number, default: 2 },
  isVerified: { type: Boolean, default: false },
  // Organization profile fields
  phone: { type: String },
  address: { type: String },
  description: { type: String },
  website: { type: String },
  profileImage: { type: String },
}, { timestamps: true });

// Member Schema
export interface IMember extends Document {
  userId?: mongoose.Types.ObjectId;
  firstName: string;
  middleName?: string;
  lastName: string;
  username: string;
  picture?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  dateOfBirth?: Date;
  auxiliaryBody: string; // Atfal, Khuddam, Lajna, Ansarullah, Nasra
  postHolding?: string;
  status: string; // active, inactive
  deletedAt?: Date; // Soft delete field
  createdAt: Date;
}

const MemberSchema = new Schema<IMember>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  picture: { type: String },
  address: { type: String },
  phoneNumber: { type: String },
  email: { type: String },
  dateOfBirth: { type: Date },
  auxiliaryBody: { type: String, required: true },
  postHolding: { type: String },
  status: { type: String, required: true, default: "active" },
  deletedAt: { type: Date },
}, { timestamps: true });

// Event Schema
export interface IEvent extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate: Date;
  registrationStartDate?: Date;
  registrationEndDate?: Date;
  eventType: string; // registration, ticket
  maxAttendees?: number;
  eligibleAuxiliaryBodies: string[];
  allowGuests: boolean;
  allowInvitees: boolean;
  customRegistrationFields: CustomFormField[];
  requiresPayment: boolean;
  paymentAmount?: number;
  paymentCurrency: string;
  paymentMethods: string[];
  paymentRecipient: string; // platform, organizer
  paymentSettings?: any;
  status: string; // upcoming, active, completed, cancelled
  createdBy: mongoose.Types.ObjectId;
  eventImage?: string;
  eventBanner?: string;
  tags?: string[];
  isPrivate: boolean;
  qrCodeData?: string;
  csvData?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String },
  location: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationStartDate: { type: Date },
  registrationEndDate: { type: Date },
  eventType: { type: String, required: true, default: "registration" },
  maxAttendees: { type: Number },
  eligibleAuxiliaryBodies: [{ type: String }],
  allowGuests: { type: Boolean, required: true, default: false },
  allowInvitees: { type: Boolean, required: true, default: false },
  customRegistrationFields: [{ type: Schema.Types.Mixed }],
  requiresPayment: { type: Boolean, required: true, default: false },
  paymentAmount: { type: Number },
  paymentCurrency: { type: String, required: true, default: "NGN" },
  paymentMethods: [{ type: String }],
  paymentRecipient: { type: String, required: true, default: "platform" },
  paymentSettings: { type: Schema.Types.Mixed },
  status: { type: String, required: true, default: "upcoming" },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventImage: { type: String },
  eventBanner: { type: String },
  tags: [{ type: String }],
  isPrivate: { type: Boolean, required: true, default: false },
  qrCodeData: { type: String },
  csvData: { type: String },
  deletedAt: { type: Date },
}, { timestamps: true });

// Event Registration Schema
export interface IEventRegistration extends Document {
  eventId: mongoose.Types.ObjectId;
  memberId?: mongoose.Types.ObjectId;
  registrationType: string; // member, guest, invitee
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  auxiliaryBody?: string;
  qrCode: string;
  uniqueId: string;
  status: string; // pending, confirmed, attended, cancelled
  registrationData: any;
  paymentStatus: string; // pending, paid, failed
  paymentReference?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  ticketNumber?: string;
  validatedAt?: Date;
  validatedBy?: mongoose.Types.ObjectId;
  facePhotoPath?: string;
  receiptPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventRegistrationSchema = new Schema<IEventRegistration>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
  registrationType: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String },
  auxiliaryBody: { type: String },
  qrCode: { type: String, required: true },
  uniqueId: { type: String, required: true, unique: true },
  status: { type: String, required: true, default: "pending" },
  registrationData: { type: Schema.Types.Mixed, required: true },
  paymentStatus: { type: String, required: true, default: "pending" },
  paymentReference: { type: String },
  paymentMethod: { type: String },
  paymentAmount: { type: Number },
  ticketNumber: { type: String },
  validatedAt: { type: Date },
  validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  facePhotoPath: { type: String },
  receiptPath: { type: String },
}, { timestamps: true });

// Export the models
// Notification Schema
export interface INotification extends Document {
  organizationId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId; // User ID who will receive the notification
  senderId?: mongoose.Types.ObjectId; // User ID who sent the notification (for super admin messages)
  type: string; // payment_received, ticket_purchased, event_registration, super_admin_message, system_alert
  title: string;
  message: string;
  data?: any; // Additional data (event details, payment info, etc.)
  priority: string; // low, medium, high, urgent
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string; // URL to navigate when notification is clicked
  actionLabel?: string; // Button text for action
  expiresAt?: Date; // When notification should be auto-deleted
  category: string; // payments, events, messages, system
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  priority: { type: String, required: true, default: "medium" },
  isRead: { type: Boolean, required: true, default: false },
  readAt: { type: Date },
  actionUrl: { type: String },
  actionLabel: { type: String },
  expiresAt: { type: Date },
  category: { type: String, required: true },
}, { timestamps: true });

// Add indexes for performance
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ticket Schema (for ticket-based events)
export interface ITicket extends Document {
  eventId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  ownerEmail: string;
  ownerPhone?: string;
  ownerName: string;
  ticketNumber: string;
  category: string;
  price: number;
  currency: string;
  status: string; // pending, paid, cancelled, used
  paymentStatus: string; // pending, paid, failed, refunded
  paymentReference?: string;
  paymentMethod?: string;
  qrCode: string;
  validatedAt?: Date;
  validatedBy?: mongoose.Types.ObjectId;
  transferHistory: Array<{
    fromEmail?: string;
    toEmail: string;
    transferredAt: Date;
    reason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  ownerEmail: { type: String, required: true },
  ownerPhone: { type: String },
  ownerName: { type: String, required: true },
  ticketNumber: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true, default: "NGN" },
  status: { type: String, required: true, default: "pending" },
  paymentStatus: { type: String, required: true, default: "pending" },
  paymentReference: { type: String },
  paymentMethod: { type: String },
  qrCode: { type: String, required: true },
  validatedAt: { type: Date },
  validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  transferHistory: [{ type: Schema.Types.Mixed }],
}, { timestamps: true });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
export const User = mongoose.model<IUser>('User', UserSchema);
export const Member = mongoose.model<IMember>('Member', MemberSchema);
export const Event = mongoose.model<IEvent>('Event', EventSchema);
export const EventRegistration = mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema);
export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);

// Zod schemas for validation
export const insertOrganizationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  status: z.string().default("pending"),
  subscriptionPlan: z.string().default("basic"),
  subscriptionStatus: z.string().default("active"),
  maxEvents: z.number().default(10),
  maxMembers: z.number().default(500),
  settings: z.any().default({}),
});

export const insertUserSchema = z.object({
  organizationId: z.string().optional(),
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().default("member"),
  status: z.string().default("active"),
  phoneNumber: z.string().optional(),
  twoFactorEnabled: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
});

export const insertEventSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  registrationStartDate: z.date().optional(),
  registrationEndDate: z.date().optional(),
  eventType: z.string().default("registration"),
  maxAttendees: z.number().optional(),
  eligibleAuxiliaryBodies: z.array(z.string()),
  allowGuests: z.boolean().default(false),
  allowInvitees: z.boolean().default(false),
  customRegistrationFields: z.array(z.any()),
  requiresPayment: z.boolean().default(false),
  paymentAmount: z.number().optional(),
  paymentCurrency: z.string().default("NGN"),
  paymentMethods: z.array(z.string()),
  paymentRecipient: z.string().default("platform"),
  status: z.string().default("upcoming"),
  createdBy: z.string(),
  isPrivate: z.boolean().default(false),
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;