import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

type Faculty = { id: string; name: string };
type Department = { id: string; name: string; facultyId: string | null };
type Student = {
  id: string;
  matricNo: string;
  fullName: string;
  facultyId?: string | null;
  departmentId?: string | null;
  faculty?: string | null;
  department?: string | null;
  level?: string | null;
  photoUrl?: string | null;
};

export default function StudentEdit() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [matricNo, setMatricNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [level, setLevel] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [facultyId, setFacultyId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const deptsFiltered = useMemo(() => {
    if (!facultyId) return departments;
    return departments.filter((d) => d.facultyId === facultyId || d.facultyId == null);
  }, [departments, facultyId]);

  const loadFaculties = useCallback(async () => {
    const rows = await api<Faculty[]>("/faculties");
    setFaculties(rows);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const [s, fac, deps] = await Promise.all([
          api<Student>(`/students/${id}`),
          api<Faculty[]>("/faculties"),
          api<Department[]>("/departments"),
        ]);
        if (cancelled) return;
        setFaculties(fac);
        setDepartments(deps);
        setStudent(s);
        setMatricNo(s.matricNo);
        setFullName(s.fullName);
        setLevel(s.level ?? "");
        setPhotoUrl(s.photoUrl ?? "");
        const fid = s.facultyId ?? "";
        setFacultyId(fid);
        setDepartmentId(s.departmentId ?? "");
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function onFacultyChange(fid: string) {
    setFacultyId(fid);
    setDepartmentId("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setErr(null);
    try {
      await api(`/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          matricNo,
          fullName,
          level: level || undefined,
          photoUrl: photoUrl || undefined,
          facultyId: facultyId || null,
          departmentId: departmentId || null,
        }),
      });
      nav("/students");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  if (!id) return <p>Missing student id.</p>;

  return (
    <>
      <p>
        <Link to="/students">← Students</Link>
      </p>
      <h1>Edit student</h1>
      <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
        Update profile fields. Fingerprint templates are managed from <strong>Enroll fingerprint</strong> on the students list.
      </p>
      {!student && !err && <p>Loading…</p>}
      {err && <p className="error">{err}</p>}
      {student && (
        <div className="card">
          <form onSubmit={submit}>
            <label>Matric</label>
            <input value={matricNo} onChange={(e) => setMatricNo(e.target.value)} required />
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <label>Level (optional)</label>
            <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. 300" />
            <label>Photo URL (optional)</label>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} type="url" placeholder="https://..." />
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
              {deptsFiltered.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {err && <p className="error">{err}</p>}
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="submit">Save</button>
              <button type="button" className="secondary" onClick={() => nav("/enrollment/students")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
