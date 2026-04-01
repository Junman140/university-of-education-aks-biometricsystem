/** Plain objects returned by `.lean()` for type-safe queries. */
export interface UserLean {
  _id: string;
  email: string;
  passwordHash: string;
  role: string;
  tenantId?: string | null;
  displayName?: string;
}

export interface DeviceLean {
  _id: string;
  tenantId: string;
  apiKeyHash: string;
  name: string;
  hallLabel?: string | null;
  lastSeenAt?: Date | null;
}

export interface StudentLean {
  _id: string;
  tenantId: string;
  matricNo: string;
  fullName: string;
  department?: string | null;
  level?: string | null;
  photoUrl?: string | null;
}

export interface BiometricEnrollmentLean {
  _id: string;
  tenantId: string;
  studentId: string;
  fingerCode: string;
  templateEnc: Buffer;
  qualityScore?: number | null;
  templateVersion: string;
}

export interface ExamLean {
  _id: string;
  tenantId: string;
  title: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface ExamRosterEntryLean {
  _id: string;
  examId: string;
  studentId: string;
  hallLabel?: string | null;
}

export interface VerificationEventLean {
  _id: string;
}

/** Fields needed for reports / CSV joins. */
export interface VerificationEventListLean {
  _id: string;
  tenantId: string;
  studentId: string;
  deviceId?: string | null;
  capturedAt: Date;
  result: string;
  matchScore?: number | null;
}

export interface StudentReportLean {
  _id: string;
  matricNo: string;
  fullName: string;
}

export interface DeviceReportLean {
  _id: string;
  name: string;
  hallLabel?: string | null;
}
