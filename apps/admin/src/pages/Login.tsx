import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken, setUser, type UserJson } from "../api";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await api<{ token: string; user: UserJson }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      setUser(res.user);
      onLogin();
      nav("/students");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <main>
      <div className="card" style={{ maxWidth: 420, margin: "3rem auto" }}>
        <h1>Admin login</h1>
        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          {err && <p className="error">{err}</p>}
          <div style={{ marginTop: "1rem" }}>
            <button type="submit">Sign in</button>
          </div>
        </form>
      </div>
    </main>
  );
}
