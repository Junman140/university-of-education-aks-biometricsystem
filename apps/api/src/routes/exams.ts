import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Role } from "../models/roles.js";
import { Exam, ExamRosterEntry, Student } from "../models/schemas.js";
import { requireRole } from "../lib/auth.js";
import { resolveTenantId, type JwtUser } from "../lib/tenantScope.js";
import { withId, withIds } from "../lib/serialize.js";

const CreateExam = z.object({
  title: z.string().min(1),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

const RosterBulk = z.object({
  entries: z.array(
    z.object({
      studentId: z.string(),
      hallLabel: z.string().optional(),
    })
  ),
});

export async function examRoutes(app: FastifyInstance) {
  app.post(
    "/exams",
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
      const body = CreateExam.parse(req.body);
      const exam = await Exam.create({
        tenantId: tid,
        title: body.title,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      });
      return withId(exam.toObject() as { _id: string });
    }
  );

  app.get(
    "/exams",
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
      const rows = await Exam.find({ tenantId: tid }).sort({ createdAt: -1 }).lean();
      return withIds(rows as { _id: string }[]);
    }
  );

  app.post(
    "/exams/:examId/roster",
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
      const examId = (req.params as { examId: string }).examId;
      const body = RosterBulk.parse(req.body);
      const exam = await Exam.findOne({ _id: examId, tenantId: tid }).lean();
      if (!exam) return reply.code(404).send({ error: "Exam not found" });

      for (const e of body.entries) {
        const st = await Student.findOne({ _id: e.studentId, tenantId: tid }).lean();
        if (!st) return reply.code(400).send({ error: `Unknown student ${e.studentId}` });
      }

      await Promise.all(
        body.entries.map((e) =>
          ExamRosterEntry.findOneAndUpdate(
            { examId, studentId: e.studentId },
            { $set: { examId, studentId: e.studentId, hallLabel: e.hallLabel } },
            { upsert: true, new: true }
          )
        )
      );

      return { ok: true, count: body.entries.length };
    }
  );
}
