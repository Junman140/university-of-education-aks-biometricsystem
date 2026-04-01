import mongoose, { Schema } from "mongoose";
import { randomUUID } from "node:crypto";

function idString() {
  return { type: String, default: () => randomUUID() };
}

const TenantSchema = new Schema(
  {
    _id: idString(),
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: "tenants" }
);

const UserSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, ref: "Tenant", default: null },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "TENANT_ADMIN", "ENROLLER", "INVIGILATOR", "VIEWER"],
      default: "VIEWER",
    },
    displayName: String,
  },
  { timestamps: true, collection: "users" }
);

const StudentSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    matricNo: { type: String, required: true },
    fullName: { type: String, required: true },
    department: String,
    level: String,
    photoUrl: String,
  },
  { timestamps: true, collection: "students" }
);
StudentSchema.index({ tenantId: 1, matricNo: 1 }, { unique: true });

const BiometricEnrollmentSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    studentId: { type: String, required: true, ref: "Student" },
    fingerCode: { type: String, required: true },
    templateEnc: { type: Buffer, required: true },
    qualityScore: Number,
    enrolledById: { type: String, ref: "User" },
    enrolledAt: { type: Date, default: () => new Date() },
    templateVersion: { type: String, default: "sourceafis-v1" },
  },
  { collection: "biometric_enrollments" }
);
BiometricEnrollmentSchema.index({ studentId: 1, fingerCode: 1 }, { unique: true });

const DeviceSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    name: { type: String, required: true },
    hallLabel: String,
    apiKeyHash: { type: String, required: true },
    lastSeenAt: Date,
  },
  { timestamps: true, collection: "devices" }
);

const ExamSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    title: { type: String, required: true },
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true, collection: "exams" }
);

const ExamRosterEntrySchema = new Schema(
  {
    _id: idString(),
    examId: { type: String, required: true, ref: "Exam", index: true },
    studentId: { type: String, required: true, ref: "Student" },
    hallLabel: String,
  },
  { collection: "exam_roster_entries" }
);
ExamRosterEntrySchema.index({ examId: 1, studentId: 1 }, { unique: true });

const VerificationEventSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    deviceId: { type: String, ref: "Device" },
    studentId: { type: String, required: true, ref: "Student" },
    examId: String,
    result: { type: String, required: true },
    matchScore: Number,
    idempotencyKey: { type: String, sparse: true, unique: true },
    capturedAt: { type: Date, default: () => new Date() },
    syncedAt: Date,
  },
  { collection: "verification_events" }
);
VerificationEventSchema.index({ tenantId: 1, capturedAt: -1 });
VerificationEventSchema.index({ studentId: 1 });

const AuditLogSchema = new Schema(
  {
    _id: idString(),
    tenantId: { type: String, ref: "Tenant" },
    actorId: { type: String, ref: "User" },
    action: { type: String, required: true },
    entityType: String,
    entityId: String,
    meta: Schema.Types.Mixed,
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "audit_logs" }
);
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });

export const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
export const BiometricEnrollment =
  mongoose.models.BiometricEnrollment ||
  mongoose.model("BiometricEnrollment", BiometricEnrollmentSchema);
export const Device = mongoose.models.Device || mongoose.model("Device", DeviceSchema);
export const Exam = mongoose.models.Exam || mongoose.model("Exam", ExamSchema);
export const ExamRosterEntry =
  mongoose.models.ExamRosterEntry || mongoose.model("ExamRosterEntry", ExamRosterEntrySchema);
export const VerificationEvent =
  mongoose.models.VerificationEvent || mongoose.model("VerificationEvent", VerificationEventSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
