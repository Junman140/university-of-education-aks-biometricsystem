import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

type SessionRow = { id: string; label: string };

export default function AcademicSessions() {
  const [list, setList] = useState<SessionRow[]>([]);
  const [label, setLabel] = useState("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [basedOnCount, setBasedOnCount] = useState(0);
  const [edit, setEdit] = useState<SessionRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await api<SessionRow[]>("/academic-sessions");
    setList(rows);
  }, []);

  const loadSuggest = useCallback(async () => {
    const res = await api<{ suggested: string | null; basedOnCount: number }>("/academic-sessions/suggest-next");
    setSuggested(res.suggested);
    setBasedOnCount(res.basedOnCount);
  }, []);

  useEffect(() => {
    Promise.all([load(), loadSuggest()]).catch((e) => setErr(String(e)));
  }, [load, loadSuggest]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/academic-sessions", { method: "POST", body: JSON.stringify({ label: label.trim() }) });
      setLabel("");
      await Promise.all([load(), loadSuggest()]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!edit) return;
    setErr(null);
    try {
      await api(`/academic-sessions/${edit.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: edit.label.trim() }),
      });
      setEdit(null);
      await Promise.all([load(), loadSuggest()]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this academic session? References in exams or registrations may break.")) return;
    setErr(null);
    try {
      await api(`/academic-sessions/${id}`, { method: "DELETE" });
      await Promise.all([load(), loadSuggest()]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  function useSuggested() {
    if (suggested) setLabel(suggested);
  }

  return (
    <>
      <h1>Academic sessions</h1>
      <p style={{ fontSize: "0.9rem", color: "#94a3b8", maxWidth: 640 }}>
        Sessions (e.g. <strong>2024/2025</strong>) are shared across exams and course registrations. The API suggests a <strong>next</strong> label from existing data; you can still type any label.
      </p>
      <div className="card">
        <h2>Add session</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
          Suggestion from data:{" "}
          <strong style={{ color: "#e2e8f0" }}>{suggested ?? "—"}</strong>
          {basedOnCount > 0 && <span style={{ marginLeft: 8 }}>(from {basedOnCount} existing)</span>}
        </p>
        <form onSubmit={add}>
          <label>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2025/2026" required />
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="submit">Add</button>
            <button type="button" className="secondary" onClick={useSuggested} disabled={!suggested}>
              Fill with suggestion
            </button>
            <button type="button" className="secondary" onClick={() => void loadSuggest().catch((e) => setErr(String(e)))}>
              Refresh suggestion
            </button>
          </div>
        </form>
        {err && <p className="error">{err}</p>}
      </div>
      <div className="card">
        <h2>Sessions</h2>
        {edit && (
          <form onSubmit={saveEdit} style={{ marginBottom: "1rem", padding: "0.75rem", background: "#0f172a", borderRadius: 8 }}>
            <label>Edit label</label>
            <input
              value={edit.label}
              onChange={(e) => setEdit({ ...edit, label: e.target.value })}
              required
            />
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
              <button type="submit">Save</button>
              <button type="button" className="secondary" onClick={() => setEdit(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
          {list.map((s) => (
            <li key={s.id} style={{ marginBottom: "0.35rem" }}>
              <strong>{s.label}</strong>{" "}
              <code style={{ fontSize: "0.75rem", marginLeft: 8 }}>{s.id}</code>{" "}
              <button type="button" className="secondary" style={{ marginLeft: 8 }} onClick={() => setEdit({ ...s })}>
                Edit
              </button>{" "}
              <button type="button" className="secondary" onClick={() => void remove(s.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
