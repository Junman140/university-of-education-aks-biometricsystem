import { useEffect, useState } from "react";
import { api } from "../api";

type Device = { id: string; name: string; hallLabel: string | null; lastSeenAt: string | null };

export default function Devices() {
  const [list, setList] = useState<Device[]>([]);
  const [name, setName] = useState("Hall A");
  const [hall, setHall] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const rows = await api<Device[]>("/devices");
    setList(rows);
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSecret(null);
    try {
      const res = await api<{ id: string; apiKey: string }>("/devices", {
        method: "POST",
        body: JSON.stringify({ name, hallLabel: hall || undefined }),
      });
      setSecret(`${res.id} / ${res.apiKey}`);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  async function delDevice(id: string) {
    if (!confirm("Remove this device?")) return;
    setErr(null);
    try {
      await api(`/devices/${id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <>
      <h1>Devices</h1>
      <div className="card">
        <h2>Register New Device</h2>
        <form onSubmit={create}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Front Gate Terminal" />
          <label>Hall label (optional)</label>
          <input value={hall} onChange={(e) => setHall(e.target.value)} placeholder="e.g. Hall A" />
          {err && <p className="error">{err}</p>}
          {secret && (
            <div style={{ background: "#064e3b", padding: "1rem", borderRadius: 8, margin: "1rem 0", border: "1px solid #065f46" }}>
              <p style={{ margin: 0, color: "#86efac", fontWeight: 600 }}>Device API Key (Show once!)</p>
              <code style={{ display: "block", marginTop: "0.5rem", wordBreak: "break-all" }}>{secret}</code>
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <button type="submit">Register device</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Registered Devices</h2>
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #334155" }}>
              <th>Device / Hall</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0" }}>
                  <strong>{d.name}</strong><br />
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{d.hallLabel || "No Hall"}</span>
                </td>
                <td style={{ padding: "0.5rem 0", fontSize: "0.9rem", color: "#e2e8f0" }}>
                  Last seen: {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "Never"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button type="button" className="secondary" onClick={() => delDevice(d.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p style={{ color: "#94a3b8", marginTop: "1rem" }}>No devices registered.</p>}
      </div>
    </>
  );
}
