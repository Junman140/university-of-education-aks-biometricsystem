import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

type Faculty = { id: string; name: string };
type Department = { id: string; name: string; facultyId: string | null };

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
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [title, setTitle] = useState("Mid-semester");
  const [courseId, setCourseId] = useState("");
  const [academicSessionId, setAcademicSessionId] = useState("");
  const [academicYearOverride, setAcademicYearOverride] = useState("");
  const [semester, setSemester] = useState(1);
  const [examId, setExamId] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const [exams, crs, sess, facs, depts] = await Promise.all([
      api<Exam[]>("/exams"),
      api<Course[]>("/courses"),
      api<AcademicSession[]>("/academic-sessions"),
      api<Faculty[]>("/faculties"),
      api<Department[]>("/departments"),
    ]);
    setList(exams);
    setCourses(crs);
    setSessions(sess);
    setFaculties(facs);
    setDepartments(depts);
    if (crs.length && !courseId) setCourseId(crs[0].id);
    if (sess.length && !academicSessionId) setAcademicSessionId(sess[0].id);
  }

  const deptsFiltered = useMemo(() => {
    if (!facultyId) return departments;
    return departments.filter((d) => d.facultyId === facultyId || d.facultyId == null);
  }, [departments, facultyId]);

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
    if (!examId) { setErr("Please select an exam first."); return; }
    setErr(null);
    try {
      const inputs = studentIds
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api<{ ok: boolean, count: number, total: number }>(`/exams/${examId}/roster`, {
        method: "POST",
        body: JSON.stringify({ entries: inputs.map((v) => ({ matricNo: v })) }),
      });
      setStudentIds("");
      alert(`Success! Added ${res.count} of ${res.total} students to the roster.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function rosterByDept(e: React.FormEvent) {
    e.preventDefault();
    if (!examId) { setErr("Please select an exam first."); return; }
    if (!departmentId) { setErr("Please select a department first."); return; }
    setErr(null);
    try {
      const res = await api<{ ok: boolean, count: number }>(`/exams/${examId}/roster/bulk-department`, {
        method: "POST",
        body: JSON.stringify({ departmentId }),
      });
      alert(`Success! Added ${res.count} students from the selected department to the roster.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function delExam(id: string) {
    if (!confirm("Delete this exam?")) return;
    setErr(null);
    try {
      await api(`/exams/${id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <>
      <h1>Exams & roster</h1>
      <div className="card">
        <h2>Create Exam</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
          Tied to a course, academic year, and semester.
        </p>
        <form onSubmit={create}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
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
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
            <div>
              <label>Academic Session</label>
              <select value={academicSessionId} onChange={(e) => setAcademicSessionId(e.target.value)}>
                <option value="">—</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Manual Year</label>
              <input
                value={academicYearOverride}
                onChange={(e) => setAcademicYearOverride(e.target.value)}
                placeholder="2024/2025"
              />
            </div>
            <div>
              <label>Semester</label>
              <select value={semester} onChange={(e) => setSemester(+e.target.value)}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </div>

          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "1rem" }}>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Add Roster Entries</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
          Select an exam and then add students by **Department** or manually by Matric No.
        </p>
        
        <label>1. Select Exam</label>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} required>
          <option value="">— Select an exam —</option>
          {list.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title} ({x.academicYear} / Sem {x.semester})
            </option>
          ))}
        </select>

        <hr style={{ margin: "1.5rem 0", borderColor: "#334155" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <h3>Option A: Bulk Add by Department</h3>
            <form onSubmit={rosterByDept}>
              <label>Faculty</label>
              <select value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); }}>
                <option value="">— All Faculties —</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              
              <label style={{ marginTop: "0.5rem" }}>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                <option value="">— Select Department —</option>
                {deptsFiltered.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              
              <button type="submit" disabled={!examId || !departmentId} style={{ marginTop: "1rem", width: "100%" }}>
                Add All Students in Dept
              </button>
            </form>
          </div>

          <div style={{ borderLeft: "1px solid #334155", paddingLeft: "2rem" }}>
            <h3>Option B: Manual Matric Numbers</h3>
            <form onSubmit={roster}>
              <label>Matric Numbers (comma or newline separated)</label>
              <textarea 
                rows={5} 
                value={studentIds} 
                onChange={(e) => setStudentIds(e.target.value)} 
                placeholder="UED/2020/001&#10;UED/2020/002"
              />
              <button type="submit" disabled={!examId} style={{ marginTop: "1rem", width: "100%" }}>
                Add Manual List
              </button>
            </form>
          </div>
        </div>
        
        {err && <p className="error" style={{ marginTop: "1rem" }}>{err}</p>}
      </div>
      <div className="card">
        <h2>Exams List</h2>
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
              <th>Title / ID</th>
              <th>Offering</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0" }}>
                  <strong>{x.title}</strong><br />
                  <code style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{x.id}</code>
                </td>
                <td style={{ padding: "0.5rem 0", fontSize: "0.9rem", color: "#e2e8f0" }}>
                  {x.academicYear || "—"} / Sem {x.semester || "—"}<br />
                  <span style={{ color: "#94a3b8" }}>Course: {x.courseId || "Missing!"}</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button type="button" className="secondary" onClick={() => delExam(x.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p style={{ color: "#94a3b8", marginTop: "1rem" }}>No exams created yet.</p>}
      </div>
    </>
  );
}
