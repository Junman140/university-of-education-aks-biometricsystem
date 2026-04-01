import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  api,
  clearSession,
  getSelectedTenantId,
  getUser,
  setSelectedTenantId,
  type TenantRow,
} from "../api";

function Tab({ prefix, to, children }: { prefix: string; to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === prefix || pathname.startsWith(`${prefix}/`);
  return (
    <Link
      to={to}
      style={{
        fontWeight: active ? 700 : 500,
        color: active ? "#e0f2fe" : "#7dd3fc",
        textDecoration: "none",
        padding: "0.35rem 0.5rem",
        borderBottom: active ? "2px solid #38bdf8" : "2px solid transparent",
      }}
    >
      {children}
    </Link>
  );
}

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const nav = useNavigate();
  const user = getUser();
  const isSuper = user?.role === "SUPER_ADMIN";
  const [tenantKey, setTenantKey] = useState(() => getSelectedTenantId() ?? "");
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantReady, setTenantReady] = useState(!isSuper);

  useEffect(() => {
    if (!isSuper) { setTenantReady(true); return; }
    setTenantReady(false);
    api<TenantRow[]>("/tenants")
      .then((list) => {
        setTenants(list);
        let tid = getSelectedTenantId();
        if (!tid && list.length) { tid = list[0].id; setSelectedTenantId(tid); }
        setTenantKey(tid ?? "");
      })
      .catch(() => {})
      .finally(() => setTenantReady(true));
  }, [isSuper]);

  return (
    <main>
      <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid #1f2937", paddingBottom: "0.5rem" }}>
        <Tab prefix="/students" to="/students">Students</Tab>
        <Tab prefix="/exams" to="/exams">Exams</Tab>
        <Tab prefix="/verify" to="/verify">Verify</Tab>
        <Tab prefix="/settings" to="/settings">Settings</Tab>
        {isSuper && (
          <select
            value={tenantKey}
            onChange={(e) => { setSelectedTenantId(e.target.value || null); setTenantKey(e.target.value); }}
            style={{ marginLeft: "auto", maxWidth: 180 }}
          >
            {tenants.length === 0
              ? <option value="">No tenants</option>
              : tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
            }
          </select>
        )}
        <button
          type="button"
          className="secondary"
          style={isSuper ? {} : { marginLeft: "auto" }}
          onClick={() => { clearSession(); onLogout(); nav("/login"); }}
        >
          Log out
        </button>
      </nav>
      {!tenantReady ? (
        <p style={{ padding: "1rem" }}>Loading workspace…</p>
      ) : isSuper && tenants.length === 0 ? (
        <div className="card" style={{ maxWidth: 560, margin: "2rem auto" }}>
          <h2>No tenant yet</h2>
          <p>Create a tenant first via <code>POST /tenants</code> or <code>pnpm db:seed</code>, then refresh.</p>
        </div>
      ) : (
        <Outlet key={isSuper ? tenantKey : "default"} />
      )}
    </main>
  );
}
