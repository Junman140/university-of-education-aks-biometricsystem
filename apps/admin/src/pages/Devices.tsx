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

  return (
    <>
      <h1>Devices</h1>
      <div className="card">
        <form onSubmit={create}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Hall label (optional)</label>
          <input value={hall} onChange={(e) => setHall(e.target.value)} />
          {err && <p className="error">{err}</p>}
          {secret && (
            <p style={{ color: "#86efac" }}>
              Copy device id and API key now (shown once): <code>{secret}</code>
            </p>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit">Register device</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Registered</h2>
        <ul>
          {list.map((d) => (
            <li key={d.id}>
              {d.name} {d.hallLabel ? `(${d.hallLabel})` : ""} — last seen:{" "}
              {d.lastSeenAt ?? "never"}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
