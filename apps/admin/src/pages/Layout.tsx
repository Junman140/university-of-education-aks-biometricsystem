import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  api,
  clearSession,
  getSelectedTenantId,
  getUser,
  setSelectedTenantId,
  type TenantRow,
} from "../api";

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const nav = useNavigate();
  const user = getUser();
  const isSuper = user?.role === "SUPER_ADMIN";
  const [tenantKey, setTenantKey] = useState(() => getSelectedTenantId() ?? "");
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantReady, setTenantReady] = useState(() => getUser()?.role !== "SUPER_ADMIN");

  useEffect(() => {
    if (!isSuper) {
      setTenantReady(true);
      return;
    }
    setTenantReady(false);
    api<TenantRow[]>("/tenants")
      .then((list) => {
        setTenants(list);
        let tid = getSelectedTenantId();
        if (!tid && list.length) {
          tid = list[0].id;
          setSelectedTenantId(tid);
        }
        setTenantKey(tid ?? "");
      })
      .catch(() => {})
      .finally(() => setTenantReady(true));
  }, [isSuper]);

  return (
    <main>
      <nav>
        <Link to="/students">Students</Link>
        <Link to="/exams">Exams</Link>
        <Link to="/devices">Devices</Link>
        <Link to="/reports">Reports</Link>
        {isSuper && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <span>Tenant</span>
            <select
              value={tenantKey}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedTenantId(v || null);
                setTenantKey(v);
              }}
            >
              {tenants.length === 0 ? (
                <option value="">No tenants — create one (API)</option>
              ) : (
                tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
        <button
          type="button"
          className="secondary"
          style={{ marginLeft: "auto" }}
          onClick={() => {
            clearSession();
            onLogout();
            nav("/login");
          }}
        >
          Log out
        </button>
      </nav>
      {!tenantReady ? (
        <p style={{ padding: "1rem" }}>Loading workspace…</p>
      ) : isSuper && tenants.length === 0 ? (
        <div className="card" style={{ maxWidth: 560, margin: "2rem auto" }}>
          <h2>No tenant yet</h2>
          <p>
            As <strong>SUPER_ADMIN</strong>, pick a tenant for student and device data. Create one first, then refresh
            this page.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Example: <code>POST /tenants</code> with body{" "}
            <code>
              {`{ "name": "...", "slug": "...", "adminEmail": "...", "adminPassword": "..." }`}
            </code>
            , or run <code>pnpm db:seed</code> if your seed creates tenants.
          </p>
        </div>
      ) : (
        <Outlet key={isSuper ? tenantKey : "default"} />
      )}
    </main>
  );
}
