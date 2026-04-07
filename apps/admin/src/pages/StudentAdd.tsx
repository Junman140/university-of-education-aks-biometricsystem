import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

type Faculty = { id: string; name: string };
type Department = { id: string; name: string; facultyId: string | null };

export default function StudentAdd() {
  const nav = useNavigate();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [matric, setMatric] = useState("");
  const [fullName, setFullName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const deptsForFaculty = useMemo(() => {
    if (!facultyId) return departments;
    return departments.filter((d) => d.facultyId === facultyId || d.facultyId == null);
  }, [departments, facultyId]);

  const loadRefs = useCallback(async () => {
    try {
      const [f, d] = await Promise.all([api<Faculty[]>("/faculties"), api<Department[]>("/departments")]);
      setFaculties(f);
      setDepartments(d);
    } catch (e) {
      setErr("Failed to load faculties/departments");
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  function onFacultyChange(fid: string) {
    setFacultyId(fid);
    setDepartmentId("");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api<{ id: string }>("/students", {
        method: "POST",
        body: JSON.stringify({
          matricNo: matric,
          fullName,
          facultyId: facultyId || undefined,
          departmentId: departmentId || undefined,
        }),
      });
      // After creation, go to directory or enroll? 
      // User said "independent page", let's go back to directory
      nav("/students");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Student Registration</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Enter student profile details to register them in the system.</p>
      
      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={create}>
          <label>Matric / Reg No</label>
          <input 
            value={matric} 
            onChange={(e) => setMatric(e.target.value)} 
            required 
            placeholder="e.g. UED/2024/001"
            autoFocus
          />
          
          <label style={{ marginTop: "1rem" }}>Full Name</label>
          <input 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
            placeholder="Firstname Lastname"
          />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <label>Faculty</label>
              <select value={facultyId} onChange={(e) => onFacultyChange(e.target.value)}>
                <option value="">— Select Faculty —</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Select Department —</option>
                {deptsForFaculty.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {err && <p className="error" style={{ marginTop: "1rem" }}>{err}</p>}
          
          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
            <button type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Registering..." : "Register Student"}
            </button>
            <button type="button" className="secondary" onClick={() => nav("/students")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
