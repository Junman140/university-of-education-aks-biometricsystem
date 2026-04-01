import { useEffect, useState } from "react";
import { api } from "../api";

type Reg = {
  id: string;
  studentId: string;
  courseId: string;
  academicSessionId?: string | null;
  academicYear: string;
  semester: number;
};

type AcademicSession = { id: string; label: string };

export default function CourseRegistrations() {
  const [list, setList] = useState<Reg[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [academicSessionId, setAcademicSessionId] = useState("");
  const [academicYearManual, setAcademicYearManual] = useState("");
  const [semester, setSemester] = useState(1);
  const [filterStudent, setFilterStudent] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function loadRegs() {
    const qs = filterStudent.trim() ? `?studentId=${encodeURIComponent(filterStudent.trim())}` : "";
    const rows = await api<Reg[]>(`/course-registrations${qs}`);
    setList(rows);
  }

  useEffect(() => {
    api<AcademicSession[]>("/academic-sessions")
      .then((sess) => {
        setSessions(sess);
        setAcademicSessionId((prev) => prev || sess[0]?.id || "");
      })
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    loadRegs().catch((e) => setErr(String(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const yearTrim = academicYearManual.trim();
      if (!academicSessionId && !yearTrim) {
        setErr("Select an academic session or enter a manual academic year.");
        return;
      }
      const body: Record<string, unknown> = {
        studentId,
        courseId,
        semester,
      };
      if (academicSessionId) body.academicSessionId = academicSessionId;
      if (yearTrim) body.academicYear = yearTrim;
      await api("/course-registrations", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setStudentId("");
      setCourseId("");
      setAcademicYearManual("");
      await loadRegs();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <>
      <h1>Course registrations</h1>
      <p style={{ fontSize: "0.9rem", color: "#94a3b8", maxWidth: 640 }}>
        Registers a student for a course in a given <strong>academic session</strong> (or manual year) and{" "}
        <strong>semester</strong> (1 or 2). Required before exam verification when the exam is tied to that course and
        session.
      </p>
      <div className="card">
        <h2>Register student</h2>
        <form onSubmit={create}>
          <label>Student ID</label>
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
          <label>Course ID</label>
          <input value={courseId} onChange={(e) => setCourseId(e.target.value)} required />
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
            value={academicYearManual}
            onChange={(e) => setAcademicYearManual(e.target.value)}
            placeholder="e.g. 2024/2025"
          />
          <label>Semester</label>
          <select value={semester} onChange={(e) => setSemester(+e.target.value)}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit">Save registration</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Filter by student ID</h2>
        <input
          placeholder="Leave empty for all"
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          onBlur={() => loadRegs().catch((e) => setErr(String(e)))}
        />
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
              <th>Year</th>
              <th>Sem</th>
              <th>Student</th>
              <th>Course</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>{r.academicYear}</td>
                <td>{r.semester}</td>
                <td>
                  <code style={{ fontSize: "0.75rem" }}>{r.studentId}</code>
                </td>
                <td>
                  <code style={{ fontSize: "0.75rem" }}>{r.courseId}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
