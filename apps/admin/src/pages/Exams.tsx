import { useEffect, useState } from "react";
import { api } from "../api";

type Exam = {
  id: string;
  title: string;
  courseId: string | null;
  academicSessionId?: string | null;
  academicYear: string | null;
  semester: number | null;
};

type Course = { id: string; code: string; title: string };
type AcademicSession = { id: string; label: string };

export default function Exams() {
  const [list, setList] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [title, setTitle] = useState("Mid-semester");
  const [courseId, setCourseId] = useState("");
  const [academicSessionId, setAcademicSessionId] = useState("");
  const [academicYearOverride, setAcademicYearOverride] = useState("");
  const [semester, setSemester] = useState(1);
  const [examId, setExamId] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const [exams, crs, sess] = await Promise.all([
      api<Exam[]>("/exams"),
      api<Course[]>("/courses"),
      api<AcademicSession[]>("/academic-sessions"),
    ]);
    setList(exams);
    setCourses(crs);
    setSessions(sess);
    if (crs.length && !courseId) setCourseId(crs[0].id);
    if (sess.length && !academicSessionId) setAcademicSessionId(sess[0].id);
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const yearTrim = academicYearOverride.trim();
      if (!academicSessionId && !yearTrim) {
        setErr("Select an academic session or enter a manual academic year.");
        return;
      }
      const body: Record<string, unknown> = {
        title,
        courseId,
        semester,
      };
      if (academicSessionId) body.academicSessionId = academicSessionId;
      if (yearTrim) body.academicYear = yearTrim;
      await api("/exams", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAcademicYearOverride("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function roster(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const ids = studentIds
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api(`/exams/${examId}/roster`, {
        method: "POST",
        body: JSON.stringify({ entries: ids.map((studentId) => ({ studentId })) }),
      });
      setStudentIds("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <>
      <h1>Exams & roster</h1>
      <div className="card">
        <h2>Create exam</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
          Each exam is tied to a <strong>course</strong>, <strong>academic session</strong> (or manual year), and{" "}
          <strong>semester</strong>. Verification checks the student is registered for that offering.
        </p>
        <form onSubmit={create}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            {courses.length === 0 ? (
              <option value="">Create a course in Catalog first</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))
            )}
          </select>
          <label>Academic session</label>
          <select value={academicSessionId} onChange={(e) => setAcademicSessionId(e.target.value)}>
            <option value="">—</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <label>Manual academic year (only if no session selected)</label>
          <input
            value={academicYearOverride}
            onChange={(e) => setAcademicYearOverride(e.target.value)}
            placeholder="e.g. 2024/2025 when session is empty"
          />
          <label>Semester</label>
          <select value={semester} onChange={(e) => setSemester(+e.target.value)}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Add roster entries</h2>
        <form onSubmit={roster}>
          <label>Exam ID</label>
          <input value={examId} onChange={(e) => setExamId(e.target.value)} required />
          <label>Student IDs (comma or newline separated)</label>
          <textarea rows={4} value={studentIds} onChange={(e) => setStudentIds(e.target.value)} />
          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit">Save roster</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Exams</h2>
        <ul>
          {list.map((x) => (
            <li key={x.id}>
              <code>{x.id}</code> — {x.title}
              {x.academicYear != null && (
                <span style={{ color: "#94a3b8" }}>
                  {" "}
                  (year {x.academicYear}, sem {x.semester ?? "?"}, course {x.courseId ?? "—"}
                  {x.academicSessionId ? `, session ${x.academicSessionId}` : ""})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
