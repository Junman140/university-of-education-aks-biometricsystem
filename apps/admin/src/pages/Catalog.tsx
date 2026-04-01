import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";

type Faculty = { id: string; name: string };
type Department = { id: string; name: string; facultyId: string | null };
type Course = {
  id: string;
  code: string;
  title: string;
  facultyId?: string | null;
  departmentId?: string | null;
  faculty?: string | null;
  department?: string | null;
};

type Tab = "faculties" | "departments" | "courses";

export default function Catalog() {
  const [tab, setTab] = useState<Tab>("faculties");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [facName, setFacName] = useState("");
  const [depName, setDepName] = useState("");
  const [depFacultyId, setDepFacultyId] = useState<string>("");
  const [cCode, setCCode] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cFacultyId, setCFacultyId] = useState<string>("");
  const [cDeptId, setCDeptId] = useState<string>("");

  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editCourse, setEditCourse] = useState<Course | null>(null);

  const facultyById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of faculties) m.set(f.id, f.name);
    return m;
  }, [faculties]);

  const loadFaculties = useCallback(async () => {
    const rows = await api<Faculty[]>("/faculties");
    setFaculties(rows);
  }, []);

  const loadDepartments = useCallback(async () => {
    const rows = await api<Department[]>("/departments");
    setDepartments(rows);
  }, []);

  const loadCourses = useCallback(async () => {
    const rows = await api<Course[]>("/courses");
    setCourses(rows);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadFaculties(), loadDepartments(), loadCourses()]);
  }, [loadCourses, loadDepartments, loadFaculties]);

  useEffect(() => {
    loadAll().catch((e) => setErr(String(e)));
  }, [loadAll]);

  const deptsForCourseFaculty = useMemo(() => {
    if (!cFacultyId) return departments;
    return departments.filter((d) => d.facultyId === cFacultyId || d.facultyId == null);
  }, [cFacultyId, departments]);

  async function addFaculty(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/faculties", { method: "POST", body: JSON.stringify({ name: facName }) });
      setFacName("");
      await loadFaculties();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function saveFaculty(e: React.FormEvent) {
    e.preventDefault();
    if (!editFaculty) return;
    setErr(null);
    try {
      await api(`/faculties/${editFaculty.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editFaculty.name }),
      });
      setEditFaculty(null);
      await loadFaculties();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function delFaculty(id: string) {
    if (!confirm("Delete this faculty? Departments may still reference it.")) return;
    setErr(null);
    try {
      await api(`/faculties/${id}`, { method: "DELETE" });
      await loadFaculties();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function addDepartment(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/departments", {
        method: "POST",
        body: JSON.stringify({
          name: depName,
          facultyId: depFacultyId || null,
        }),
      });
      setDepName("");
      setDepFacultyId("");
      await loadDepartments();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function saveDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!editDept) return;
    setErr(null);
    try {
      await api(`/departments/${editDept.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editDept.name,
          facultyId: editDept.facultyId,
        }),
      });
      setEditDept(null);
      await loadDepartments();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function delDepartment(id: string) {
    if (!confirm("Delete this department?")) return;
    setErr(null);
    try {
      await api(`/departments/${id}`, { method: "DELETE" });
      await loadDepartments();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function addCourse(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/courses", {
        method: "POST",
        body: JSON.stringify({
          code: cCode,
          title: cTitle,
          facultyId: cFacultyId || undefined,
          departmentId: cDeptId || undefined,
        }),
      });
      setCCode("");
      setCTitle("");
      setCFacultyId("");
      setCDeptId("");
      await loadCourses();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!editCourse) return;
    setErr(null);
    try {
      await api(`/courses/${editCourse.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: editCourse.code,
          title: editCourse.title,
          facultyId: editCourse.facultyId ?? undefined,
          departmentId: editCourse.departmentId ?? undefined,
        }),
      });
      setEditCourse(null);
      await loadCourses();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function delCourse(id: string) {
    if (!confirm("Delete this course?")) return;
    setErr(null);
    try {
      await api(`/courses/${id}`, { method: "DELETE" });
      await loadCourses();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <>
      <h1>Catalog</h1>
      <p style={{ fontSize: "0.9rem", color: "#94a3b8", maxWidth: 640 }}>
        Maintain <strong>faculties</strong>, <strong>departments</strong>, and <strong>courses</strong>. These lists power dropdowns when enrolling students and scheduling exams.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(
          [
            ["faculties", "Faculties"],
            ["departments", "Departments"],
            ["courses", "Courses"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? undefined : "secondary"}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {err && <p className="error">{err}</p>}

      {tab === "faculties" && (
        <div className="card">
          <h2>Add faculty</h2>
          <form onSubmit={addFaculty}>
            <label>Name</label>
            <input value={facName} onChange={(e) => setFacName(e.target.value)} required />
            <div style={{ marginTop: "0.75rem" }}>
              <button type="submit">Add</button>
            </div>
          </form>
          {editFaculty && (
            <form onSubmit={saveFaculty} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #334155" }}>
              <h3>Edit faculty</h3>
              <label>Name</label>
              <input
                value={editFaculty.name}
                onChange={(e) => setEditFaculty({ ...editFaculty, name: e.target.value })}
                required
              />
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                <button type="submit">Save</button>
                <button type="button" className="secondary" onClick={() => setEditFaculty(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
                <th>Name</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {faculties.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="secondary" onClick={() => setEditFaculty({ ...f })}>
                      Edit
                    </button>{" "}
                    <button type="button" className="secondary" onClick={() => void delFaculty(f.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "departments" && (
        <div className="card">
          <h2>Add department</h2>
          <form onSubmit={addDepartment}>
            <label>Name</label>
            <input value={depName} onChange={(e) => setDepName(e.target.value)} required />
            <label>Faculty (optional)</label>
            <select value={depFacultyId} onChange={(e) => setDepFacultyId(e.target.value)}>
              <option value="">— None —</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div style={{ marginTop: "0.75rem" }}>
              <button type="submit">Add</button>
            </div>
          </form>
          {editDept && (
            <form onSubmit={saveDepartment} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #334155" }}>
              <h3>Edit department</h3>
              <label>Name</label>
              <input
                value={editDept.name}
                onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
                required
              />
              <label>Faculty</label>
              <select
                value={editDept.facultyId ?? ""}
                onChange={(e) => setEditDept({ ...editDept, facultyId: e.target.value || null })}
              >
                <option value="">— None —</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                <button type="submit">Save</button>
                <button type="button" className="secondary" onClick={() => setEditDept(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
                <th>Name</th>
                <th>Faculty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.facultyId ? facultyById.get(d.facultyId) ?? "—" : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="secondary" onClick={() => setEditDept({ ...d })}>
                      Edit
                    </button>{" "}
                    <button type="button" className="secondary" onClick={() => void delDepartment(d.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "courses" && (
        <div className="card">
          <h2>Add course</h2>
          <form onSubmit={addCourse}>
            <label>Code</label>
            <input value={cCode} onChange={(e) => setCCode(e.target.value)} required placeholder="e.g. CSC301" />
            <label>Title</label>
            <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} required />
            <label>Faculty (optional)</label>
            <select
              value={cFacultyId}
              onChange={(e) => {
                setCFacultyId(e.target.value);
                setCDeptId("");
              }}
            >
              <option value="">—</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label>Department (optional)</label>
            <select value={cDeptId} onChange={(e) => setCDeptId(e.target.value)}>
              <option value="">—</option>
              {deptsForCourseFaculty.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div style={{ marginTop: "0.75rem" }}>
              <button type="submit">Add</button>
            </div>
          </form>
          {editCourse && (
            <form onSubmit={saveCourse} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #334155" }}>
              <h3>Edit course</h3>
              <label>Code</label>
              <input
                value={editCourse.code}
                onChange={(e) => setEditCourse({ ...editCourse, code: e.target.value })}
                required
              />
              <label>Title</label>
              <input
                value={editCourse.title}
                onChange={(e) => setEditCourse({ ...editCourse, title: e.target.value })}
                required
              />
              <label>Faculty</label>
              <select
                value={editCourse.facultyId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditCourse({ ...editCourse, facultyId: v || null, departmentId: null });
                }}
              >
                <option value="">—</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <label>Department</label>
              <select
                value={editCourse.departmentId ?? ""}
                onChange={(e) => setEditCourse({ ...editCourse, departmentId: e.target.value || null })}
              >
                <option value="">—</option>
                {(editCourse.facultyId
                  ? departments.filter((d) => d.facultyId === editCourse.facultyId || d.facultyId == null)
                  : departments
                ).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                <button type="submit">Save</button>
                <button type="button" className="secondary" onClick={() => setEditCourse(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
                <th>Code</th>
                <th>Title</th>
                <th>Faculty</th>
                <th>Dept</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.title}</td>
                  <td>{c.facultyId ? facultyById.get(c.facultyId) ?? c.faculty ?? "—" : c.faculty ?? "—"}</td>
                  <td>
                    {c.departmentId
                      ? departments.find((d) => d.id === c.departmentId)?.name ?? c.department ?? "—"
                      : c.department ?? "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="secondary" onClick={() => setEditCourse({ ...c })}>
                      Edit
                    </button>{" "}
                    <button type="button" className="secondary" onClick={() => void delCourse(c.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
