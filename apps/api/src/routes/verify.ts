import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Role } from "../models/roles.js";
import type { BiometricEnrollmentLean, ExamRosterEntryLean, StudentLean } from "../models/lean.js";
import {
  BiometricEnrollment,
  ExamRosterEntry,
  Student,
  VerificationEvent,
} from "../models/schemas.js";
import { requireRole } from "../lib/auth.js";
import { resolveTenantId, type JwtUser } from "../lib/tenantScope.js";
import { decryptTemplate } from "../lib/crypto.js";
import { extractTemplate, isMatchingUnreachable, matchTemplates, matchingServiceUrl } from "../lib/matchingClient.js";
import { authenticateDevice } from "../lib/deviceAuth.js";

const VerifyBody = z.object({
  matricNo: z.string().min(1),
  examId: z.string().optional(),
  imageBase64: z.string().min(1),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
  dpi: z.coerce.number().int().positive().default(500),
  format: z.enum(["png", "raw_gray8"]),
  matchThreshold: z.coerce.number().optional(),
});

function tplBuf(enc: Buffer | Uint8Array | { buffer: ArrayBuffer }): Buffer {
  if (Buffer.isBuffer(enc)) return enc;
  return Buffer.from(enc as Uint8Array);
}

async function runVerify(args: {
  tenantId: string;
  matricNo: string;
  examId?: string;
  deviceId?: string;
  body: z.infer<typeof VerifyBody>;
}) {
  const { tenantId, matricNo, examId, deviceId, body } = args;
  const student = await Student.findOne({ tenantId, matricNo }).lean<StudentLean | null>();
  if (!student) {
    return { result: "no_student", matchScore: null as number | null, student: null };
  }

  if (examId) {
    const onRoster = await ExamRosterEntry.findOne({ examId, studentId: student._id }).lean<ExamRosterEntryLean | null>();
    if (!onRoster) {
      return { result: "not_on_roster", matchScore: null, student: { id: student._id, matricNo } };
    }
  }

  const enrollments = await BiometricEnrollment.find({ studentId: student._id }).lean<BiometricEnrollmentLean[]>();
  if (!enrollments.length) {
    return { result: "not_enrolled", matchScore: null, student: { id: student._id, matricNo } };
  }

  let probe: { template_base64: string };
  try {
    probe = await extractTemplate({
      imageBase64: body.imageBase64,
      width: body.width,
      height: body.height,
      dpi: body.dpi,
      format: body.format,
    });
  } catch (e: unknown) {
    if (isMatchingUnreachable(e)) {
      throw Object.assign(new Error("MATCHING_UNAVAILABLE"), {
        cause: e,
      });
    }
    throw e;
  }

  const threshold = body.matchThreshold ?? 20;
  let best = -1;
  let matched = false;
  for (const e of enrollments) {
    const raw = decryptTemplate(tplBuf(e.templateEnc));
    const candB64 = raw.toString("base64");
    let m: { score: number; matched: boolean };
    try {
      m = await matchTemplates(probe.template_base64, candB64, threshold);
    } catch (err: unknown) {
      if (isMatchingUnreachable(err)) {
        throw Object.assign(new Error("MATCHING_UNAVAILABLE"), { cause: err });
      }
      throw err;
    }
    if (m.score > best) best = m.score;
    if (m.matched) matched = true;
  }

  if (matched) {
    await VerificationEvent.create({
      tenantId,
      deviceId,
      studentId: student._id,
      examId,
      result: "match",
      matchScore: best,
    });
    return {
      result: "match",
      matchScore: best,
      student: {
        id: student._id,
        matricNo: student.matricNo,
        fullName: student.fullName,
        photoUrl: student.photoUrl,
      },
    };
  }

  await VerificationEvent.create({
    tenantId,
    deviceId,
    studentId: student._id,
    examId,
    result: "no_match",
    matchScore: best,
  });

  return {
    result: "no_match",
    matchScore: best,
    student: {
      id: student._id,
      matricNo: student.matricNo,
      fullName: student.fullName,
      photoUrl: student.photoUrl,
    },
  };
}

export async function verifyRoutes(app: FastifyInstance) {
  app.post(
    "/verify/one-to-one",
    {
      onRequest: [
        app.authenticate,
        requireRole([
          Role.SUPER_ADMIN,
          Role.TENANT_ADMIN,
          Role.ENROLLER,
          Role.INVIGILATOR,
        ]),
      ],
    },
    async (req, reply) => {
      const user = req.user as JwtUser;
      const tid = resolveTenantId(req, reply, user);
      if (!tid) return;
      const body = VerifyBody.parse(req.body);
      try {
        return await runVerify({
          tenantId: tid,
          matricNo: body.matricNo,
          examId: body.examId,
          body,
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "MATCHING_UNAVAILABLE") {
          return reply.code(503).send({
            error: "Matching service unavailable",
            hint: `Start the SourceAFIS Java service at ${matchingServiceUrl()}.`,
          });
        }
        throw e;
      }
    }
  );

  app.post(
    "/device/verify/one-to-one",
    { onRequest: [authenticateDevice] },
    async (req, reply) => {
      const body = VerifyBody.parse(req.body);
      try {
        return await runVerify({
          tenantId: req.device!.tenantId,
          matricNo: body.matricNo,
          examId: body.examId,
          deviceId: req.device!.id,
          body,
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "MATCHING_UNAVAILABLE") {
          return reply.code(503).send({
            error: "Matching service unavailable",
            hint: `Start the SourceAFIS Java service at ${matchingServiceUrl()}.`,
          });
        }
        throw e;
      }
    }
  );
}
