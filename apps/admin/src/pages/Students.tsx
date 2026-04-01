import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Student = {
  id: string;
  matricNo: string;
  fullName: string;
  department: string | null;
};

export default function Students() {
  const [list, setList] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [matric, setMatric] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    const rows = await api<Student[]>(`/students${qs}`);
    setList(rows);
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/students", {
        method: "POST",
        body: JSON.stringify({ matricNo: matric, fullName }),
      });
      setMatric("");
      setFullName("");
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
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.matricNo}</td>
                <td>{s.fullName}</td>
                <td>
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
