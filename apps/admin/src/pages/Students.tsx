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
  isEnrolled?: boolean;
};

export default function Students() {
  const [list, setList] = useState<Student[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [q, setQ] = useState("");
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

  const loadRefs = useCallback(async () => {
    const [f, d] = await Promise.all([api<Faculty[]>("/faculties"), api<Department[]>("/departments")]);
    setFaculties(f);
    setDepartments(d);
  }, []);

  async function load(page = meta.page) {
    const params = new URLSearchParams();
    if (q) params.append("q", q);
    params.append("page", String(page));
    params.append("limit", "10");

    try {
      const res = await api<{ data: Student[], meta: typeof meta }>(`/students?${params.toString()}`);
      setList(res.data);
      setMeta(res.meta);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    Promise.all([loadRefs(), load(1)]).catch((e) => setErr(String(e)));
  }, []);

  function displayFaculty(s: Student) {
    if (s.facultyId && facultyById.has(s.facultyId)) return facultyById.get(s.facultyId);
    return s.faculty ?? "—";
  }

  function displayDept(s: Student) {
    if (s.departmentId && deptById.has(s.departmentId)) return deptById.get(s.departmentId);
    return s.department ?? "—";
  }

  async function deleteBiometric(studentId: string) {
    if (!confirm("Are you sure you want to delete this student's biometric data? They will need to re-enroll to be verified.")) return;
    try {
      await api(`/students/${studentId}/enrollments`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete biometric");
    }
  }

  return (
    <>
      <h1>Student Directory</h1>
      <div className="card">
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            placeholder="Search by Name or Matric No..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={() => load(1)}>Search</button>
        </div>
        
        {list.length > 0 ? (
          <>
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
                    <td>
                      {s.fullName}
                      {s.isEnrolled && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", padding: "1px 4px", background: "#052e16", color: "#4ade80", borderRadius: 4, fontWeight: 700 }}>ENROLLED</span>}
                    </td>
                    <td>{displayFaculty(s)}</td>
                    <td>{displayDept(s)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Link to={`/students/${s.id}/edit`}>Edit</Link>
                        {" · "}
                        <Link to={`/enroll/${s.id}`}>{s.isEnrolled ? "Re-enroll" : "Enroll"}</Link>
                        {s.isEnrolled && (
                          <>
                            {" · "}
                            <button 
                              type="button" 
                              className="secondary" 
                              style={{ padding: "1px 4px", fontSize: "0.75rem", color: "#f87171" }}
                              onClick={() => deleteBiometric(s.id)}
                            >
                              Delete Biometric
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {meta.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #334155" }}>
                <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                  Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} students
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" className="secondary" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Previous</button>
                  <button type="button" className="secondary" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p style={{ marginTop: "1rem", color: "#94a3b8" }}>
            {q ? "No students found matching your search." : "Enter a search term above to find students."}
          </p>
        )}
      </div>
    </>
  );
}
