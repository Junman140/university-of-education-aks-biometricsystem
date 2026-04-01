import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Faculty = { id: string; name: string };
type Department = { id: string; name: string; facultyId: string | null };
type Student = {
  id: string;
  matricNo: string;
  fullName: string;
  facultyId?: string | null;
  departmentId?: string | null;
  faculty: string | null;
  department: string | null;
};

export default function Students() {
  const [list, setList] = useState<Student[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [q, setQ] = useState("");
  const [matric, setMatric] = useState("");
  const [fullName, setFullName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const facultyById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of faculties) m.set(f.id, f.name);
    return m;
  }, [faculties]);

  const deptById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departments) m.set(d.id, d.name);
    return m;
  }, [departments]);

  const deptsForFaculty = useMemo(() => {
    if (!facultyId) return departments;
    return departments.filter((d) => d.facultyId === facultyId || d.facultyId == null);
  }, [departments, facultyId]);

  const loadRefs = useCallback(async () => {
    const [f, d] = await Promise.all([api<Faculty[]>("/faculties"), api<Department[]>("/departments")]);
    setFaculties(f);
    setDepartments(d);
  }, []);

  async function load() {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    const rows = await api<Student[]>(`/students${qs}`);
    setList(rows);
  }

  useEffect(() => {
    Promise.all([loadRefs(), load()]).catch((e) => setErr(String(e)));
  }, []);

  function onFacultyChange(fid: string) {
    setFacultyId(fid);
    setDepartmentId("");
  }

  function displayFaculty(s: Student) {
    if (s.facultyId && facultyById.has(s.facultyId)) return facultyById.get(s.facultyId);
    return s.faculty ?? "—";
  }

  function displayDept(s: Student) {
    if (s.departmentId && deptById.has(s.departmentId)) return deptById.get(s.departmentId);
    return s.department ?? "—";
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/students", {
        method: "POST",
        body: JSON.stringify({
          matricNo: matric,
          fullName,
          facultyId: facultyId || undefined,
          departmentId: departmentId || undefined,
        }),
      });
      setMatric("");
      setFullName("");
      setFacultyId("");
      setDepartmentId("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <>
      <h1>Students</h1>
      <div className="card">
        <h2>Add student</h2>
        <form onSubmit={create}>
          <label>Matric</label>
          <input value={matric} onChange={(e) => setMatric(e.target.value)} required />
          <label>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <label>Faculty</label>
          <select value={facultyId} onChange={(e) => onFacultyChange(e.target.value)}>
            <option value="">—</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <label>Department</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">—</option>
            {deptsForFaculty.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Search</h2>
        <input
          placeholder="Filter..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => load().catch((e) => setErr(String(e)))}
        />
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
              <th>Matric</th>
              <th>Name</th>
              <th>Faculty</th>
              <th>Dept</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.matricNo}</td>
                <td>{s.fullName}</td>
                <td>{displayFaculty(s)}</td>
                <td>{displayDept(s)}</td>
                <td>
                  <Link to={`/students/${s.id}/edit`}>Edit</Link>
                  {" · "}
                  <Link to={`/enroll/${s.id}`}>Enroll fingerprint</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
