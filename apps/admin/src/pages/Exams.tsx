import { useEffect, useState } from "react";
import { api } from "../api";

type Exam = { id: string; title: string };

export default function Exams() {
  const [list, setList] = useState<Exam[]>([]);
  const [title, setTitle] = useState("Mid-semester");
  const [examId, setExamId] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const rows = await api<Exam[]>("/exams");
    setList(rows);
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/exams", { method: "POST", body: JSON.stringify({ title }) });
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
        <form onSubmit={create}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
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
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
