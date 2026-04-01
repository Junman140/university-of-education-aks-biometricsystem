import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Role } from "../models/roles.js";
import type { StudentLean } from "../models/lean.js";
import { AuditLog, BiometricEnrollment, Student } from "../models/schemas.js";
import { requireRole } from "../lib/auth.js";
import { resolveTenantId, type JwtUser } from "../lib/tenantScope.js";
import { withId, withIds } from "../lib/serialize.js";

const UpsertStudent = z.object({
  matricNo: z.string().min(1),
  fullName: z.string().min(1),
  department: z.string().optional(),
  level: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export async function studentRoutes(app: FastifyInstance) {
  app.post(
    "/students",
    {
      onRequest: [
        app.authenticate,
        requireRole([Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ENROLLER]),
      ],
    },
    async (req, reply) => {
      const user = req.user as JwtUser;
      const tid = resolveTenantId(req, reply, user);
      if (!tid) return;
      const body = UpsertStudent.parse(req.body);
      try {
        const s = await Student.create({
          tenantId: tid,
          matricNo: body.matricNo,
          fullName: body.fullName,
          department: body.department,
          level: body.level,
          photoUrl: body.photoUrl,
        });
        await AuditLog.create({
          tenantId: tid,
          actorId: user.sub,
          action: "student.create",
          entityType: "Student",
          entityId: s._id,
        });
        return withId(s.toObject() as { _id: string });
      } catch (e: unknown) {
        if ((e as { code?: number }).code === 11000) {
          return reply.code(409).send({ error: "Matric already exists" });
        }
        throw e;
      }
    }
  );

  app.get(
    "/students",
    {
      onRequest: [
        app.authenticate,
        requireRole([
          Role.SUPER_ADMIN,
          Role.TENANT_ADMIN,
          Role.ENROLLER,
          Role.INVIGILATOR,
          Role.VIEWER,
        ]),
      ],
    },
    async (req, reply) => {
      const user = req.user as JwtUser;
      const tid = resolveTenantId(req, reply, user);
      if (!tid) return;
      const q = (req.query as { q?: string })?.q?.trim();
      const filter: Record<string, unknown> = { tenantId: tid };
      if (q) {
        filter.$or = [
          { matricNo: { $regex: q, $options: "i" } },
          { fullName: { $regex: q, $options: "i" } },
        ];
      }
      const rows = await Student.find(filter).sort({ matricNo: 1 }).limit(200).lean();
      return withIds(rows as { _id: string }[]);
    }
  );

  app.get(
    "/students/:id",
    {
      onRequest: [
        app.authenticate,
        requireRole([
          Role.SUPER_ADMIN,
          Role.TENANT_ADMIN,
          Role.ENROLLER,
          Role.INVIGILATOR,
          Role.VIEWER,
        ]),
      ],
    },
    async (req, reply) => {
      const user = req.user as JwtUser;
      const tid = resolveTenantId(req, reply, user);
      if (!tid) return;
      const s = await Student.findOne({ _id: (req.params as { id: string }).id, tenantId: tid }).lean<StudentLean | null>();
      if (!s) return reply.code(404).send({ error: "Not found" });
      const enrollments = await BiometricEnrollment.find({ studentId: s._id }).lean();
      return { ...withId(s), enrollments };
    }
  );
}
